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
- בקרה שלילית: שש מוטציות על G5–G9, כל אחת בנפרד, כל אחת אדימה את השער המדויק שהיא אמורה לשמור עליו (ר' "סטיות מהתכנון" בבריף לפירוט מלא)
