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
    // כל מסלול חייב לענות פעם אחת בדיוק: תגובה כפולה = ERR_HTTP_HEADERS_SENT,
    // ואפס תגובות = בקשה תלויה עד ה-timeout של Caddy.
    const output = `${stdout ?? ""}${stderr ?? ""}`.trim();

    if (err) {
      log(`am start failed (code ${err.code}): ${err.message}`);
      if (output) log(`am start output: ${output}`);
      json(res, 500, { ok: false, error: err.message, output });
      return;
    }

    if (stdout.includes(FULLY_STARTING_MSG)) {
      log("Fully Kiosk is starting...");
      json(res, 200, { ok: true });
      return;
    }

    // am הצליח אבל לא דיווח על הפעלה — למשל component שגוי
    log(`am start: פלט לא צפוי: ${output}`);
    json(res, 502, { ok: false, error: "am did not report Fully starting", output });
  });
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
