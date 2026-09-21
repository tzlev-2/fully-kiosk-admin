#!/usr/bin/env node
/**
 * configure-fully-device.mjs — ספייק
 *
 * מגדיר מכשיר Fully Kiosk עם ההגדרות ההכרחיות למשחקים הלימודיים,
 * דרך ה-REST API של Fully (setBooleanSetting / setStringSetting).
 * מקור ההגדרות: learn-booster/documentation/הגדרות-שצריך-לקבוע.md
 *
 * שימוש:
 *   FULLY_URL=http://10.8.0.4:2323 FULLY_PASSWORD='...' node configure-fully-device.mjs
 *   node configure-fully-device.mjs http://10.8.0.4:2323 '<password>'
 *
 * דורש Node 18+ (fetch גלובלי).
 */

const DRY_RUN = process.argv.includes('--dry-run') || process.env.DRY_RUN === '1';
const positional = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const DEVICE = positional[0] || process.env.FULLY_URL || 'http://127.0.0.1:2323';
const PASSWORD = positional[1] || process.env.FULLY_PASSWORD || '';

if (!PASSWORD && !DRY_RUN) {
  console.error('חסרה סיסמה. הרץ עם FULLY_PASSWORD=... או כארגומנט שני (או --dry-run).');
  process.exit(2);
}

// הזרקת הבוסטר על gingim (מתוך המסמך)
const INJECT_JS_CODE = `(() => {if (window.location.hostname === "gingim.net") {const url = "https://preview.gingim.tzlev.ovh/i.js";fetch(url).then((r) => r.text()).then(eval);}document.querySelector('.yydev-accessibility').remove();})();`;

/** @type {{key:string, type:'bool'|'string', value:any, note?:string}[]} */
const SETTINGS = [
  { key: 'remoteAdmin', type: 'bool', value: true, note: 'ה-REST API' },
  { key: 'remoteAdminLan', type: 'bool', value: true, note: 'גישת REST מהרשת' },
  { key: 'enableLocalhost', type: 'bool', value: true, note: 'שרת ה-REST המקומי' },
  { key: 'ignoreSSLerrors', type: 'bool', value: true },
  { key: 'webviewMixedContent', type: 'string', value: '0' },
  {
    key: 'removeXframeOptionsUrl',
    type: 'string',
    value: 'https://gingim.net/*\nhttp://127.0.0.1:2323/*',
    note: 'CORS/X-Frame — מאפשר למשחקים לקרוא ל-API',
  },
  { key: 'injectJsCode', type: 'string', value: INJECT_JS_CODE, note: 'הזרקת בוסטר gingim' },
];

const base = DEVICE.replace(/\/$/, '');

/** מחיל הגדרה בודדת ב-POST (בטוח לערכים ארוכים כמו injectJsCode) */
async function applySetting(s) {
  const cmd = s.type === 'bool' ? 'setBooleanSetting' : 'setStringSetting';
  if (DRY_RUN) {
    const preview = String(s.value).replace(/\n/g, '⏎').slice(0, 70);
    return { ok: true, msg: `[dry-run] ${cmd}(${s.key}) = "${preview}"` };
  }
  const body = new URLSearchParams({
    cmd,
    key: s.key,
    value: String(s.value),
    password: PASSWORD,
    type: 'json',
  });
  const res = await fetch(`${base}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const text = await res.text();
  let ok = res.ok;
  let msg = text.trim();
  try {
    const j = JSON.parse(text);
    msg = j.statustext ?? JSON.stringify(j);
    ok = j.status === 'OK' || /success|ok/i.test(msg);
  } catch {
    /* לא-JSON */
  }
  return { ok, msg: msg.slice(0, 100) };
}

(async () => {
  console.log(`${DRY_RUN ? '🔍 DRY-RUN — ' : ''}מגדיר ${base} — ${SETTINGS.length} הגדרות\n`);
  let fail = 0;
  for (const s of SETTINGS) {
    try {
      const r = await applySetting(s);
      if (!r.ok) fail++;
      console.log(`  ${r.ok ? '✅' : '⚠️ '} ${s.key.padEnd(24)} ${s.note ? '— ' + s.note : ''}`);
      if (DRY_RUN || !r.ok) console.log(`      ↳ ${r.msg}`);
    } catch (e) {
      fail++;
      console.log(`  ❌ ${s.key.padEnd(24)} — ${e.message}`);
    }
  }
  console.log(`\n${fail === 0 ? '✅ הושלם בהצלחה' : `⚠️ הסתיים עם ${fail} כשלים`}`);
  process.exit(fail === 0 ? 0 : 1);
})();
