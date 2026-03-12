#!/data/data/com.termux/files/usr/bin/bash
# סקריפט התקנה — Caddy CORS Proxy + kiosk-restart-server
# הרצה: bash setup.sh

set -euo pipefail

CONFIG_DIR="$HOME/.config/kiosk-proxy"
SERVICE_DIR="$PREFIX/var/service"
LOG_DIR="$PREFIX/var/log/sv"
SHELL_BIN="/data/data/com.termux/files/usr/bin/sh"

echo "=== התקנת חבילות ==="
pkg update
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

const FULLY_STARTING_MSG = "Starting: Intent { cmp=com.fullykiosk.emm/de.ozerov.fully.MainActivity }";

/**
 * 
 * @param {import("http").ServerResponse} res 
 * @param {number} status 
 * @param {any} object 
 * @returns {void} 
 */
function json(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

/**
 * 
 * @param {string} msg 
 * @returns {void}
 */
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

/**
 * 
 * @param {import("http").ServerResponse} res 
 * @returns {Promise<void>}
 */
async function startFullyKiosk(res) {
  execFile("am", ["start", "-n", FULLY_COMPONENT], (err, stdout, stderr) => {

    log(`am start stderr: ${stderr}`);

    if (err || stderr) {
      if (err?.message) log(`am start failed: ${err?.message}`);
      if (err?.code) log(`am start exit code: ${err.code}`);
      if (stderr) log(`am start stderr: ${stderr}`);

      json(res, 500, { ok: false, error: err?.message || stderr });
    }

    if (stdout.includes(FULLY_STARTING_MSG)) {
      log(`am start stdout: ${stdout}`);
      log("Fully Kiosk is starting...");
      json(res, 200, { ok: true });
    }
  })
}

createServer(async (req, res) => {
  const path = new URL(req.url, "http://x/").pathname;
  log(`${req.method} ${path}`);

  // GET /status — בדיקה אם Fully Kiosk רץ
  if (path === "/status") {
    const alive = await isKioskAlive();
    json(res, 200, { alive, kiosk_url: KIOSK_URL });
    return;
  }

  if (path === "/favicon.ico") {
    res.writeHead(204);
    res.end();
    return;
  }

  // GET /restart — הפעלה מחדש של Fully Kiosk
  if (path === "/restart") {
    log("Received restart request");
  }

  // כל שאר הבקשות (שגיאות 502/504 מ-Caddy) — הפעלה מחדש
  startFullyKiosk(res);
  return;

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

sv-enable caddy
sv-enable kiosk-restart

echo ""
echo "=== הסתיים בהצלחה! ==="
echo "  Caddyfile:             $CONFIG_DIR/Caddyfile"
echo "  kiosk-restart-server:  $CONFIG_DIR/kiosk-restart-server.js"
echo "  סטטוס:                 sv status caddy && sv status kiosk-restart"
echo "  פרוקסי זמין ב:        http://localhost:8765"
echo "  לוגים זמינים ב-       $LOG_DIR/sv/caddy/ ו- $LOG_DIR/sv/kiosk-restart/"