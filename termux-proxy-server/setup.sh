#!/data/data/com.termux/files/usr/bin/bash
# סקריפט התקנה — Caddy CORS Proxy + kiosk-restart-server
# הרצה: bash setup.sh

set -euo pipefail

CONFIG_DIR="$HOME/.config/kiosk-proxy"
SERVICE_DIR="$PREFIX/var/service"
LOG_DIR="$PREFIX/var/log"
SHELL_BIN="/data/data/com.termux/files/usr/bin/sh"

echo "=== התקנת חבילות ==="
pkg install -y caddy termux-services nodejs

echo "=== יצירת תיקיית קונפיגורציה: $CONFIG_DIR ==="
mkdir -p "$CONFIG_DIR"

# --- Caddyfile ---
cat > "$CONFIG_DIR/Caddyfile" << 'CADDYFILE'
# Caddy reverse proxy עבור Fully Kiosk
# הפעלה: caddy run --config Caddyfile
# או עם משתנה סביבה: KIOSK_URL=http://192.168.1.50:2323 caddy run --config Caddyfile

:{$PROXY_PORT:8765} {
	# Preflight — CORS OPTIONS
	@options method OPTIONS
	respond @options "" 204

	# כותרות CORS לכל תגובה
	header {
		Access-Control-Allow-Origin *
		Access-Control-Allow-Methods "GET, POST, OPTIONS"
		Access-Control-Allow-Headers "*"
		-Server
	}

	# בדיקת חיות של הפרוקסי עצמו
	respond /ping "pong" 200

	# ניהול Fully Kiosk — מעביר לשרת Node
	handle /restart* {
		reverse_proxy localhost:{$RESTART_PORT:9000}
	}
	handle /status* {
		reverse_proxy localhost:{$RESTART_PORT:9000}
	}

	# כל השאר — proxy לFully Kiosk
	reverse_proxy {$KIOSK_URL:http://localhost:2323} {
		header_up Host {upstream_hostport}
		lb_try_duration 2s
	}

	handle_errors 502 503 504 {
		reverse_proxy localhost:{$RESTART_PORT:9000}
	}
}
CADDYFILE

echo "  ✓ Caddyfile"

# --- kiosk-restart-server.js ---
cat > "$CONFIG_DIR/kiosk-restart-server.js" << 'NODEJS'
// שרת ניהול Fully Kiosk — restart, status
import { createServer } from "http";
import { execFile } from "child_process";

const PORT = process.env.RESTART_PORT ?? 9000;
const KIOSK_URL = process.env.KIOSK_URL ?? "http://localhost:2323";
const FULLY_COMPONENT = "com.fullykiosk.emm/de.ozerov.fully.MainActivity";

function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function isKioskAlive() {
  try {
    const res = await fetch(KIOSK_URL, { signal: AbortSignal.timeout(3000) });
    return res.status < 500;
  } catch {
    return false;
  }
}

createServer(async (req, res) => {
  const path = new URL(req.url, "http://x/").pathname;
  log(`${req.method} ${path}`);

  // GET /restart — הפעלה מחדש של Fully Kiosk
  if (path === "/restart") {
    execFile("am", ["start", "-n", FULLY_COMPONENT], (err) => {
      if (err) {
        log(`am start failed: ${err.message}`);
        json(res, 500, { ok: false, error: err.message });
      } else {
        log("Fully Kiosk restarted");
        json(res, 200, { ok: true });
      }
    });
    return;
  }

  // GET /status — בדיקה אם Fully Kiosk רץ
  if (path === "/status") {
    const alive = await isKioskAlive();
    json(res, 200, { alive, kiosk_url: KIOSK_URL });
    return;
  }

  // כל שאר הבקשות (שגיאות 502/504 מ-Caddy) — הפעלה מחדש
  execFile("am", ["start", "-n", FULLY_COMPONENT], (err) => {
    if (err) {
      log(`auto-restart failed: ${err.message}`);
      json(res, 500, { ok: false, error: "kiosk_unavailable", restart: false });
    } else {
      log("auto-restart triggered by Caddy error");
      json(res, 503, { ok: false, error: "kiosk_unavailable", restart: true });
    }
  });
}).listen(PORT, () => {
  log(`kiosk-server listening on :${PORT}`);
});
NODEJS

echo "  ✓ kiosk-restart-server.js"

# === סרוויס caddy ===
echo "=== יצירת סרוויס caddy ==="
mkdir -p "$SERVICE_DIR/caddy/log"
mkdir -p "$LOG_DIR/caddy"

cat > "$SERVICE_DIR/caddy/run" << EOF
#!$SHELL_BIN
exec caddy run --config $HOME/.config/kiosk-proxy/Caddyfile 2>&1
EOF

cat > "$SERVICE_DIR/caddy/log/run" << EOF
#!$SHELL_BIN
exec svlogd -tt $LOG_DIR/caddy
EOF

chmod +x "$SERVICE_DIR/caddy/run"
chmod +x "$SERVICE_DIR/caddy/log/run"
echo "  ✓ caddy service"

# === סרוויס kiosk-restart ===
echo "=== יצירת סרוויס kiosk-restart ==="
mkdir -p "$SERVICE_DIR/kiosk-restart/log"
mkdir -p "$LOG_DIR/kiosk-restart"

cat > "$SERVICE_DIR/kiosk-restart/run" << EOF
#!$SHELL_BIN
exec node $HOME/.config/kiosk-proxy/kiosk-restart-server.js 2>&1
EOF

cat > "$SERVICE_DIR/kiosk-restart/log/run" << EOF
#!$SHELL_BIN
exec svlogd -tt $LOG_DIR/kiosk-restart
EOF

chmod +x "$SERVICE_DIR/kiosk-restart/run"
chmod +x "$SERVICE_DIR/kiosk-restart/log/run"
echo "  ✓ kiosk-restart service"

# === הפעלה ===
echo "=== מפעיל סרוויסים ==="
sv up caddy
sv up kiosk-restart

echo ""
echo "=== הסתיים בהצלחה! ==="
echo "  Caddyfile:             $CONFIG_DIR/Caddyfile"
echo "  kiosk-restart-server:  $CONFIG_DIR/kiosk-restart-server.js"
echo "  סטטוס:                 sv status caddy && sv status kiosk-restart"
echo "  פרוקסי זמין ב:         http://localhost:8765"
