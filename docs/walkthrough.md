# יומן פיתוח — ניהול קיוסק פולי (kiosk-admin)

## 2026-09-22 11:40

### מכשיר-מעבדה: אנדרואיד בקונטיינר עם Fully Kiosk ו-REST חי

הוקמה סביבת ניסויים שמאפשרת לבדוק שינויים בממשק הניהול בלי לגעת בטאבלטים שבכיתות.
הכול תחת `dev-device/` (סקריפטים + יחידות systemd); הצד התשתיתי של המכונה מתועד
ב-`tzlev-docs-repo` → `knowledge/workflows/runbooks/runbook-kiosk-dev-android-container.md`,
והפרויקט כולו מנותב מ-`kiosk-admin/README.md` שם.

#### מה בוצע

- **ReDroid ולא אמולטור**: למכונה אין וירטואליזציה מקוננת (`/proc/cpuinfo` ללא
  `vmx`/`svm`, אין `/dev/kvm`), ולכן אנדרואיד רץ על ליבת המאחסן. אנדרואיד 15
  x86_64, מסך 1280x800.
- **`setup.sh`** — מודולי ליבה (`loop`, `dm_mod`, `binder_linux`) + מכשירי binder
  ב-0666 + שלוש יחידות quadlet, הכול עמיד-אתחול.
- **`provision.sh`** — אוטומטי ואידמפוטנטי: APK עם אימות sha256, התקנה עם `-g`,
  הדלקת Remote Admin, שרידות-אתחול, והחלת `scripts/configure-fully-device.mjs`.
- **`snapshot.sh`** — save/restore של `/data`; שוחזר בפועל אחרי ניסוי הרסני.
- **`kiosk-dev-route.service`** — מוסיף default route ל-netns אחרי אתחול אנדרואיד.
- **`Caddyfile`** — פרוקסי ה-CORS שהממשק מחייב, על פורט 12323.

#### מה שנלמד בדרך (ועלה זמן)

- **מודול `loop` חסר הוא החוסם.** אנדרואיד 15 מרכיב ~72 חבילות APEX דרך loop
  devices; בלעדיו `apexd-bootstrap` נכשל ו-init מפיל את המערכת ב-`exit 129`
  **בלי שום לוג** — `podman logs` ריק כי ל-init אין `/dev/kmsg`. רק `dmesg -T` גילה.
- **פודמן ללא-שורש לא מריץ את זה**: חיבור loop device מצריך `CAP_SYS_ADMIN` אמיתי.
- **`androidboot.` היא חלק משם הפרמטר** — `redroid.width=…` מתעלם בשקט.
- **הדלקת Remote Admin אין לה נתיב adb**; נכתבת ישר ל-`shared_prefs` (שמות
  המפתחות חולצו מה-dex של ה-APK). זה מה שמבטל את הצעד הידני.
- **device owner**: `dpm` חייב לקדום להדלקת Remote Admin (אחרת «Unknown admin»),
  והקוד `FULLY_PROVISIONING_CODE=FFF` נפתר מול הענן של Fully ולכן דורש רשת.

#### מה לא נאמן במעבדה

אין Play Services ומסך-מגע, SELinux כבוי, Fully בגרסה לא-מורשית, ואנדרואיד 15 מול
גרסאות ישנות בשטח. התנהגות kiosk/lockdown צריכה אימות על טאבלט אמיתי לפני פריסה.

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
