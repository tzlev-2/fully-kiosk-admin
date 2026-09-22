# יומן פיתוח — ניהול קיוסק פולי (kiosk-admin)

## 2026-09-22 10:41

### אריח "משחקי הלמידה" בלאונצ'ר, ופריסה כמעט ללא מגע

- `src/lib/provisioning/fully-settings.json` — נוסף אריח תשיעי ל-`launcherApps`:
  **משחקי הלמידה** → `https://learn-games.tzlev.ovh`. אריח "היכנס למצב קיוסק"
  נשאר במקומו, כך שאפשר להיכנס לקיוסק ממסך הפתיחה בלי מכשיר חדש.
- הופעל גם על המכשיר החי דרך `setStringSetting` (‏POST, כי הערך ארוך).

#### מה שהתבהר על ה-provisioning עצמו

- **`FULLY_PROVISIONING_CODE=FFF`** מדלג על מסך ה-Provisioning Code.
- הענקת ה-appops **לפני** השקת `ProvisioningActivity` מבטלת את כל מסכי
  ההרשאות. נשארת הקשת `CONTINUE` אחת.
- ⚠️ ה-OAuth token של פרופיל `avibr_AT_tzlev_com` **פג** באמצע העבודה
  ו-`wrangler` החזיר 403. הריענון: להריץ פקודת `cf` כלשהי עם הפרופיל,
  והיא כותבת טוקן חדש לקובץ.


## 2026-09-22 10:17

### נקודת provisioning: הממשק מגיש את קונפיג ה-Fully למכשיר חדש

מכשיר חדש מוגדר עכשיו **מ-ADB בלבד**, בלי ענן של Fully ובלי הגדרה ידנית:
‏`ProvisioningActivity` מוריד את ה-JSON מהממשק, ו-Fully מייבא אותו.

#### מה נוסף

- **`functions/provision/[[path]].ts`** — ‏Pages Function שמגישה את הקונפיג.
  בודקת טוקן בהשוואת-זמן-קבוע מול `PROVISION_TOKEN`, ומזריקה את ערכי ה-`*Enc`
  מ-`FULLY_SECRETS`. בלי טוקן — 404.
- **`src/lib/provisioning/fully-settings.json`** — 401 מפתחות, **בלי אף סוד**.
  ‏`remoteAdminPasswordEnc`, `kioskPinEnc` ו-`kioskWifiPinEnc` הוצאו לסודות של
  Pages, כי ההצפנה של Fully הפיכה עם מפתח שמוטמע ב-APK.

#### למה הנתיב הוא `/provision/<שם>.json`

‏Fully מסיק את סוג הקובץ **מסיומת ה-URL**. עם `/provision` הוא נכשל ב-
`JSON file must be in JSON format, now: provision`. מכאן ה-catch-all
`[[path]].ts` — הכתובת חייבת להסתיים ב-`.json`.

#### פריסה

הפרויקט הועבר לחשבון Cloudflare של tzlev (‏`kiosk-admin-alm.pages.dev`),
והדומיין `kiosk-admin.tzlev.ovh` הוסב אליו. אין Git integration — פריסה ידנית:
‏`bun run build` ואז `wrangler pages deploy build --project-name kiosk-admin`.

⚠️ **לא להריץ `cf deploy` על הריפו הזה** — הוא ממיר את הפרויקט ל-`adapter-cloudflare`
ומשנה `svelte.config.js`, `wrangler.jsonc`, `package.json` ו-`tsconfig.json`.

#### אומת על מכשיר

‏`TAB KINGKONG` (אנדרואיד 13): התקנה, `dpm set-device-owner`, ואז
`am start … --es FULLY_SETTINGS_DOWNLOAD_LOCATION "https://kiosk-admin.tzlev.ovh/provision/fully-settings.json?token=…"`
→ ‏`Settings imported` → קיוסק נעול, 406 מפתחות, 8 אריחים.


## 2026-09-22 01:13

### ‏termux-proxy-server: הסקריפט עובד בעולם האמיתי, ודף מצב-קיוסק מוגש מהמכשיר

הסקריפט `termux-proxy-server/setup.sh` נבדק לראשונה על מכשיר אמיתי
(`TAB KINGKONG`, אנדרואיד 13, ‏`10.8.0.7`) ונמצא שהוא נופל בצעד האחרון —
ותוקן עד לריצה נקייה מאפס, כולל על Termux שהותקן מחדש מהיסוד.

#### מה תוקן ב-`setup.sh`

- **`export SVDIR`** — ‏`sv up` נכשל ב-`unable to change to service directory`
  ב-shell לא-אינטראקטיבי, והסקריפט מת ב-`set -e` **אחרי** שהפריסה כבר הצליחה
  (‏`runsvdir` מרים את השירותים לבד). דיווח כישלון על הצלחה.
- **ביטול שכפול הקונפיג** — הסקריפט החזיק heredoc של `Caddyfile`
  ושל `kiosk-restart-server.js`, וה-heredoc כבר **נשר מהקובץ שבריפו**: חסרה בו
  `Access-Control-Allow-Private-Network`. עכשיו הוא מעתיק את הקבצים שלידו ונופל
  אם הם חסרים. 318 שורות → 130.
- **‏`caddy validate`** לפני הפעלה, ו**אימות `/ping` + `/status`** בסוף עם זנב-לוגים בכשל.
- **שרידות reboot** — יצירת `~/.termux/boot/start-services.sh` ובדיקה אם
  `com.termux.boot` מותקן (אזהרה מפורשת אם לא).
- **`pkg upgrade` עם `--force-confold/--force-confdef` ו-`DEBIAN_FRONTEND=noninteractive`** —
  על bootstrap טרי dpkg שואל על `openssl.cnf`, מקבל EOF, ו-`pkg` נופל ב-exit 100;
  ובלי השדרוג `node` לא נטען כלל (`OSSL_PROVIDER_add_conf_parameter`).
- **אימות מקצה-לקצה ממתין ל-`/status`** ולא ל-`/ping` — ‏Caddy עונה ל-ping לבדו,
  וזה ייצר כשל-שווא בזמן ש-node עלה.

#### דף המעבר למצב קיוסק

- `web/enable-kiosk-mode.html` (מקור: `tzlev-2/FullyKiosk`) עם נפילה מסודרת
  כשהוא נטען מחוץ ל-Fully.
- ‏Caddyfile: ‏`handle /kiosk*` להגשת הדף, ו-`handle /files/*` לקבצים סטטיים
  (‏ZIP ל-`loadZipFile`).
- ⚠️ **לא לטעון דרך `localhost`** — ‏Fully ממפה כל כתובת localhost לנתיב בדיסק,
  והמסך מציג `File /:8765/kiosk not found`. עם ה-IP של המכשיר זה עובד:
  הדף נטען, ה-JS interface ענה, והוא חזר לדף הקודם.

#### `kiosk-restart-server.js`

`startFullyKiosk` ענה פעמיים כש-`am` הדפיס ל-stderr והצליח (`ERR_HTTP_HEADERS_SENT`),
ולא ענה כלל כש-stdout לא תאם — עכשיו בדיוק תגובה אחת בכל מסלול.


## 2026-03-11 19:30

### שדרוג ארכיטקטורה: PWA אופליין, SPA mode, וארגון קוד

שדרוג תשתיתי מקיף — מעבר ל-adapter-static עם SPA mode, תמיכת PWA אופליין מלאה, ארגון מחדש של מבנה הקבצים, והמרת CSS מותאם אישית לטיילווינד.

#### מה בוצע?

**1. PWA ותמיכה אופליין**

- מעבר מ-`adapter-cloudflare` ל-`adapter-static` עם `fallback: 'index.html'`
- הגדרת `@vite-pwa/sveltekit` עם `kit.spa: true` ו-precache של 33 קבצים
- רישום SW דינמי ב-`onMount` עם `virtual:pwa-register` (לפי הדוקומנטציה הרשמית)
- הזרקת manifest דינמית עם `virtual:pwa-info`
- ביטול SSR (`export const ssr = false` ב-layout.ts)
- הוספת type declarations ב-`app.d.ts` עם `/// <reference types>`

**2. ארגון מבנה קבצים**

- העברת לוגיקה ל-`src/lib/`: `fullyKioskClient.ts`, `fullyKioskTypes.ts`, `kioskController.svelte.ts`, `texts.ts`
- העברת קומפוננטות UI ל-`routes/_components/` (מוחרג מניתוב FS)
- עדכון כל ה-imports ל-`$lib/` ו-`../_components/`

**3. המרת CSS לטיילווינד**

- הסרת toggle-btn/toggle-thumb custom CSS — הומר ל-Tailwind utility classes ישירות בקומפוננטה
- `pulse-live` keyframe הוחלף ב-`animate-pulse` של Tailwind
- `fade-in-up` הוגדר כ-`@theme` animation ב-Tailwind v4
- CSS גלובלי צומצם מ-43 ל-15 שורות

**4. שיפורים נוספים**

- הוספת timeout של 8 שניות לקריאות REST לקיוסק (ו-10 שניות לצילום מסך)
- יצירת דף 404 מותאם אישית עם daisyUI hero component
- הסרת proxy-server (Caddyfile, kiosk-restart-server.js)

#### החלטות ארכיטקטורה

- **`index.html` במקום `200.html`**: נבחר כי אין prerender בפרויקט — אין סיכוי להתנגשות, ומתאים יותר לשרתים סטטיים
- **Dynamic import ל-registerSW**: דרישה רשמית של vite-pwa עם SvelteKit — רישום סטטי גורם לשגיאות SSR
- **`adapter-static` במקום `adapter-cloudflare`**: adapter-cloudflare מייצר HTML דינמי שלא נכנס ל-precache, מה שמונע עבודה אופליין
- **`_components/` ולא `(components)/`**: תיקיות עם prefix `_` מוחרגות מניתוב FS ב-SvelteKit — פשוט ומוסכמה רשמית

#### מעקפים ופתרונות

- **`vite-plugin-pwa` ו-`workbox-window` כ-devDependencies ישירים**: Bun שומר transitive deps ב-`.bun/` ולא ב-`node_modules/` root, מה שגורם ל-TypeScript ו-Rollup לא למצוא אותם
- **`kit.spa: true` ב-PWA options**: בלי זה, adapter-static מייצר את index.html *אחרי* יצירת ה-SW, אז הוא לא נכנס ל-precache
