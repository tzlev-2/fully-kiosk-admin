# תוכנית — פיצ'ר "הגדר מכשיר" בממשק kiosk-admin

**מטרה:** כפתור בממשק הניהול שמחיל על המכשיר המחובר את סט ההגדרות ההכרחי
למשחקים הלימודיים, דרך ה-REST API של Fully — בלחיצה אחת, במקום להגדיר ידנית.

**רקע / הוכחת-היתכנות:** הספייק `scripts/configure-fully-device.mjs` כבר מחיל
את הסט ומאומת מול מכשיר חי (7/7). הפיצ'ר הזה מעביר את אותה לוגיקה לתוך האפליקציה.

**מקור-אמת להגדרות:**
`learn-games-project/apps/learn-booster/documentation/הגדרות-שצריך-לקבוע.md`.

---

## הסט (7 הגדרות)
| key | סוג | ערך | תפקיד |
|---|---|---|---|
| `remoteAdmin` | bool | `true` | ה-REST API |
| `remoteAdminLan` | bool | `true` | גישת REST מהרשת |
| `enableLocalhost` | bool | `true` | שרת ה-REST המקומי |
| `ignoreSSLerrors` | bool | `true` | |
| `webviewMixedContent` | string | `0` | |
| `removeXframeOptionsUrl` | string | `https://gingim.net/*`\n`http://127.0.0.1:2323/*` | CORS/X-Frame — קריאה ל-API מהמשחקים |
| `injectJsCode` | string | הזרקת בוסטר gingim | |

---

## שלבי מימוש

### 1. מודל הנתונים — `src/lib/deviceSettings.ts`
- ייצוא `REQUIRED_SETTINGS: DeviceSetting[]` (מהספייק), עם `{ key, type: 'bool'|'string', value, note }`.
- מקור יחיד לסט; הספייק והפיצ'ר יצרכו אותו (אפשר לייבא ל-`.mjs` דרך build, או להשאיר עותק מסונכרן עם בדיקת-טסט).

### 2. הרחבת הקליינט — `src/lib/fullyKioskClient.ts`
- `setStringSetting(key, value)` — כמו `setBooleanSetting` הקיים, אבל **POST** (בטוח לערכים ארוכים כמו `injectJsCode`).
- `applyDeviceSettings(settings, onProgress?)` — לולאה על הסט, מחזירה `{ key, ok, msg }[]`.
  - ⚠️ ב-`request()` הנוכחי הכל GET; להוסיף תמיכת POST (Content-Type: `x-www-form-urlencoded`).

### 3. ה-controller — `src/lib/kioskController.svelte.ts`
- state: `configuring = $state(false)`, `configureResults = $state<Result[]>([])`.
- `async configureDevice()` — קורא ל-`applyDeviceSettings`, מעדכן התקדמות, מציג feedback (הצלחה/כשלים).

### 4. UI — `src/routes/_components/ActionsPanel.svelte` (או עמוד device)
- כפתור **"⚙️ הגדר מכשיר"**.
- **דיאלוג אישור** לפני ההחלה (משנה קונפיג של המכשיר).
- אזור תוצאות: שורה לכל הגדרה (✅/⚠️) — כמו פלט הספייק.
- אופציונלי: מתג **"תצוגה מקדימה"** (dry-run) שמראה מה יוגדר בלי לשלוח.

### 5. טקסטים — `src/lib/texts.ts`
- `configure-device`, `configure-success`, `configure-partial`, `confirm-configure`.

---

## שיקולים
- **POST חובה** ל-`injectJsCode` (ארוך מדי ל-URL של GET).
- **אישור לפני החלה** — משנה הגדרות מכשיר חי (תלמיד עשוי להשתמש בו).
- **טיפול בכשל פר-הגדרה** — לא לעצור בהגדרה אחת שנכשלה; לדווח על כולן.
- **`webviewMixedContent`**: המסמך קובע `0`; אם `2` (allow-always) מכוון — להחליט מהו מקור-האמת.
- **dry-run ב-UI** — נחמד לביקורת לפני שינוי.

## בדיקות
- הספייק (`configure-fully-device.mjs --dry-run`) הוא הרפרנס ההתנהגותי.
- טסט-יחידה ל-`applyDeviceSettings` (mock fetch) + טסט שה-`REQUIRED_SETTINGS` תואם למסמך.
