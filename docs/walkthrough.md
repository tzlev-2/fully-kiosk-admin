# יומן פיתוח — ניהול קיוסק פולי (kiosk-admin)

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
