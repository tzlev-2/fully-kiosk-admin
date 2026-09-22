# יומן פיתוח — ניהול קיוסק פולי (kiosk-admin)

## 2026-09-22 — slice s3-screen-grid

### גריד מסך חי, קצב סדרתי, דארק בסלקט, kebab

- `/screen` מציג גריד של מכשירים מחוברים עם מתזמן צילום סדרתי (`captureGapMs`, `runCaptureRound`)
- `DeviceScreen` משותף לגריד ול-`/d/[id]/screen`; לולאת live view נשארת בעמוד הבודד בלבד
- `NONE_CONNECTED` כשיש רשומות בלי `deviceInfo`
- `AppDropdown`: צבעי daisyUI במקום hex קשיחים
- `fullyKioskClient.ts` / `fullyKioskTypes.ts` → `fully-kiosk-client.ts` / `fully-kiosk-types.ts`
- טסט `BulkActions.svelte.spec.ts` לחיווט `SCREEN_ALL_ON`
- השתקת `state_referenced_locally` ב-`DeviceContext` (מכוון, עם `{#key device.key}`)

#### בדיקות

- `bun run check` — 0 שגיאות, 3 אזהרות `DeviceForm` בלבד
- `bun run test:unit -- --run` — 24 טסטים
- `bunx eslint .` — ירוק
- `prettier --check` על קבצי הסלייס — ירוק

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
- **`kit.spa: true` ב-PWA options**: בלי זה, adapter-static מייצר את index.html _אחרי_ יצירת ה-SW, אז הוא לא נכנס ל-precache

## 2026-09-22 — slice s2-devices (commit 1)

### bulk, rename ומתודות מוחלטות על KioskDevice

- `name` על `KioskDevice` הועבר ל-`$state` עם `renameDevice` ו-`bulk` ב-`KioskStore`
- נוספו `screenOn` / `screenOff` / `lock` / `unlock`; פעולות ללא `deviceInfo` חוזרות `false` בלי `fetch`
- `setVolume` מעדכן `volumeLevel` רק אחרי הצלחת הקליינט

#### בדיקות

- `bun run check` — ירוק
- `bun run test:unit -- --run` — 20 טסטים, כולל bulk/rename/removeDevice

## 2026-09-22 — slice s2-devices (commit 2)

### עמוד /devices — כרטיסים ופעולות קבוצתיות

- `DeviceCard`: סטטוס, סוללה, IP, שינוי שם, מחיקה, חיבור מחדש
- `BulkActions`: ניווט, מסך, נעילה, ווליום, ריסטארט אפליקציה עם משוב מאוגד
- מחרוזות חדשות ב-`texts.ts` לפי הבריף

#### בדיקות

- `bun run check` — ירוק
- `bun run test:unit -- --run` — ירוק
- `bunx eslint .` — ירוק
- `prettier --check` על קבצי הסלייס — ירוק

## 2026-09-22 — slice volume-ui

### מחוון ווליום אחד עם גילוי הדרגתי + תקרה הרסנית

- `maxLevel` נוסף ל-`VolumeCfg` (ברירת-מחדל 100) + `clampCfgToMax` טהורה; `BOOSTER_IIFE` הועתק מהייחוס כלשונו (כולל safety-net `Math.min(d.gameLevel,d.maxLevel)`)
- "עוצמה עכשיו" הפכה לנגזרת: `volumeLevel`/`isMuted` על `KioskDevice` הם getters מ-`deviceInfo.audioVolumes` (זרם 3, `audio-volumes.ts` חדש — חיפוש-לפי-מפתח, לא אינדקס) עם `optimisticVolume` מקומי שמוצג עד רענון אמיתי
- `applyDeviceInfo()` — מקום יחיד שמשים `deviceInfo` שלם ומאפס את האופטימי; כולל אתר-המיזוג ב-`kiosk-store.applyIdentity`
- `setVolume` קורא כעת ל-`refreshInBackground` אחרי כתיבה מוצלחת (לא קרא לזה בכלל קודם)
- `VolumeControl.svelte` חדשה — הבעלית היחידה של `<input type="range">` בריפו, ארבעה שימושים (עכשיו/משחק/תגמול/מקסימום) עם `data-testid`/`aria-label` ייחודיים
- `VolumeCard.svelte` מחליפה את `VolumeSliders.svelte` ואת בלוק-השמע הישן ב-`+page.svelte`; כפתור "מתקדם" חושף שלושה מחווני-תצורה עם `{#if}` אמיתי (לא CSS-בלבד)
- חיתוך `maxLevel` הרסני: הורדת התקרה מורידה `gameLevel`/`otherLevel` איתה, והערך החתוך נשמר; `volumeLimits=3:<max>` נכתב רק כשהתקרה עצמה זזה

#### באג שנמצא ותוקן

`$effect(() => void device.loadVolumeCfg(writer))` ב-`VolumeCard` היה תלוי (דרך `toRecord()`, לפני ה-`await` הראשון) ב-`device.volumeCfg` — ששני המתודות עצמן כותבות. effect שכותב למה שהוא קורא ממנו הוא לולאה-אינסופית (תיעוד Svelte). זה שכתב כל כתיבה מוצלחת בחזרה לערך מהשרת לפני שהטסט הספיק להבחין בה. תוקן ב-`untrack()`. נחשף רק כי G6/G9 בודקים את ה-DOM אחרי כתיבה, לא רק את ה-store.

#### בדיקות

- `bun run check` → 0 ERRORS, 3 WARNINGS (כולן `DeviceForm.svelte`, בסיס)
- `bunx eslint .` → נקי
- `bun run test:unit -- --run` → 76/76
- `prettier --check` על קבצי הסלייס → ירוק
- בקרה שלילית: מוטציות על G5–G9 (הרצו מרדכי וסבב-האימות הקודם, ר' §5 בבריף לרשימת סוגי-המוטציה — "בקרה שלילית — חובה"), כל אחת אדימה את השער המדויק שהיא אמורה לשמור עליו. בסבב-התיקון הנוכחי נוסף שער G10 (תווית=כפתור) עם מוטציה משלו — ר' מטה

### סבב-תיקון אחרי NO-GO של כלב (דוח `volume-ui-calev.md`, heavy)

🔴 **חוסם שתוקן — התווית הייתה כפתור-הנמכה מוסווה.** `VolumeControl.svelte` עטף את כל הבקרה ב-`<label>` בלי `for`; לפי תקן HTML הלביל-הראשון (`<button>` ה-`−`) קיבל את הקישור, לא ה-`<input>`. לחיצה על הכיתוב או על קריאת-האחוזים הנמיכה עוצמה ושלחה פקודה אמיתית למכשיר. תוקן: העטיפה הפכה ל-`<div>`, ה-`<input>` מקבל `id={testId}`, הכיתוב הפך ל-`<label for={testId}>` נפרד. שער חדש **G10** ב-`volume-card.svelte.spec.ts` בודק ששני התנאים מתקיימים לכל ארבעת המחוונים (`labels.length===1`, הלייבל הוא הכיתוב) וגם שלחיצה על הכיתוב אינה מייצרת שום `fetch`. מוטציה (`<label>` עוטף בחזרה) הרצה בפועל — G10 האדים (`labels.length: expected 1, got 0`), ואז שוחזר התיקון.

עוד שישה ממצאים מדוח כלב, כולם תוקנו:

- **כשל-כתיבה חלקי משקר לתצוגה** — `saveVolumeCfg` (`kiosk-device.svelte.ts`) עדכן `this.volumeCfg` רק אחרי שתי הכתיבות; אם השנייה (`volumeLimits`) נכשלה, המסך הציג ערכים ישנים בזמן שהמכשיר כבר קיבל את החדשים. סדר הפעולות הוחלף: `this.volumeCfg = cfg` ו-`persist()` עוברים למיד אחרי הכתיבה **הראשונה** שהצליחה; הזריקה מהכתיבה השנייה עדיין מבעבעת החוצה (טוסט-שגיאה), אבל כבר לא סותרת את התצוגה.
- **ערך אופטימי דביק** — `refreshInBackground` בלע כשלים ב-`.catch(() => {})` בלי לאפס `optimisticVolume`. עכשיו ה-`catch` מאפס אותו, כך שהתצוגה לא נתקעת על ערך שהמכשיר לא אישר.
- **`{"status":"NOK"}` על HTTP 200 נחשב הצלחה** — `setVolume` בדק רק שה-`await` לא זרק; `request()` עצמו נשאר כמות-שהוא (קוראים רבים תלויים בו). התיקון מקומי ל-`setVolume`: תשובת `NOK` מטופלת כמו זריקה.
- **רוחב מחוון (129px קבוע)** — `<input type="range">` קיבל `flex-1 min-w-0` במקום גודל-ברירת-מחדל של הדפדפן.
- **לכפתור "מתקדם" אין חיווי פתוח/סגור** — נוספה מחלקת `collapse-arrow` של daisyUI (עובדת מול `class:collapse-open` הקיים, בלי JS נוסף).
- **הפניה-תלויה ב-walkthrough** — התיקון בפסקה שמעל: הפניה ל"טבלת מוטציות" שלא קיימת בבריף הוחלפה בהפניה ל-§5 (הפסקה שכן מתארת את סוגי-המוטציה).

#### אימות חי

`bun run preview` על פורט חופשי + Playwright עם route-interception ל-host מדומה (`10.99.99.5`, אין תעבורה לטאבלט אמיתי): כל ארבעת המחוונים `labels.length===1`; לחיצה על "עוצמת משחק" לא מייצרת בקשת-רשת; רוחב המחוון גדל מ-129px ל-236px מתוך שורת 364px; מחלקת `collapse-arrow` קיימת ומוצגת (חץ ליד "מתקדם"). צילום: `/tmp/verify-fix/advanced-open.png`.

#### בדיקות

- `bun run check` → 0 ERRORS, 3 WARNINGS (כולן `DeviceForm.svelte`, בסיס)
- `bunx eslint .` → נקי
- `bun run test:unit -- --run` → 77/77 (76 + G10)
- `prettier --check` על 5 קבצי-הסבב → ירוק
