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
