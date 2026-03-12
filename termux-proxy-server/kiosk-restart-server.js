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
