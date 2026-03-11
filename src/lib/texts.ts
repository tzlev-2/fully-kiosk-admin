// טקסטים מקומיים למסך ניהול קיוסק פולי

export type ConnectionStatus =
	| 'idle'
	| 'connecting'
	| 'checking-proxy'
	| 'checking-kiosk'
	| 'restarting'
	| 'waiting'
	| 'connected'
	| 'error-proxy'
	| 'error-device';

export const CONNECTION_STATUS_TEXT: Record<ConnectionStatus, string> = {
	idle: '',
	connecting: 'מתחבר...',
	'checking-proxy': 'בודק חיבור לפרוקסי...',
	'checking-kiosk': 'בודק אם המכשיר פועל...',
	restarting: 'מפעיל את Fully Kiosk...',
	waiting: 'ממתין לאתחול המכשיר...',
	connected: '',
	'error-proxy': '⚠️ הפרוקסי אינו פעיל. הפעל את Caddy.',
	'error-device': '⚠️ הקיוסק אינו זמין. האם האפליקציה פועלת?',
};

export const KIOSK_TEXTS = {
	PAGE_TITLE: 'ניהול קיוסק פולי',

	CONNECTION_SECTION: 'הגדרות חיבור',
	ADDRESS_LABEL: 'כתובת המכשיר',
	ADDRESS_PLACEHOLDER: 'http://192.168.1.50:2323',
	PASSWORD_LABEL: 'סיסמת מנהל',
	CONNECT_BTN: 'התחבר',
	CONNECTING: 'מתחבר...',

	DEVICE_INFO_TITLE: 'מידע מכשיר',
	KIOSK_STATUS_LOCKED: 'נעול',
	KIOSK_STATUS_UNLOCKED: 'פתוח',
	SCREEN_ON: 'מסך פעיל',
	SCREEN_OFF: 'מסך כבוי',
	BATTERY: (level: number) => `סוללה: ${level}%`,
	PLUGGED: 'בטעינה',
	CURRENT_URL: 'דף פעיל',

	KIOSK_SECTION: 'מצב קיוסק',
	LOCK_KIOSK: 'הפעל מצב קיוסק',
	UNLOCK_KIOSK: 'כבה מצב קיוסק',

	WEBSITES_SECTION: 'ניווט לאתרים',
	ADD_WEBSITE_SECTION: 'הוסף אתר',
	WEBSITE_LABEL_PLACEHOLDER: 'שם האתר',
	WEBSITE_URL_PLACEHOLDER: 'https://example.com/',
	WEBSITE_LOGO_PLACEHOLDER: 'כתובת לוגו (אופציונלי)',
	ADD_BTN: 'הוסף',

	ERROR_CONNECTION: 'שגיאת חיבור — בדוק כתובת וסיסמה',
	ERROR_COMMAND: 'שגיאה בביצוע הפקודה',
	SUCCESS_LOCKED: 'הקיוסק ננעל',
	SUCCESS_UNLOCKED: 'הקיוסק שוחרר',
	SUCCESS_NAVIGATED: 'ניווט בוצע',

	DISCONNECT: 'התנתק',
	LOGIN_SUBTITLE: 'הזן את פרטי המכשיר להתחברות',
	REFRESH: 'רענן',

	ACTIONS_SECTION: 'פעולות מכשיר',
	SCREEN_TOGGLE_ON: 'הדלק מסך',
	SCREEN_TOGGLE_OFF: 'כבה מסך',
	TO_FOREGROUND: 'הבא פולי לקדמה',
	TO_BACKGROUND: 'שלח פולי לרקע',
	LAUNCH_APP_BTN: 'הפעל',
	PACKAGE_PLACEHOLDER: 'com.example.app',
	LOAD_START_URL_BTN: 'פתח כתובת בית',
	LOAD_CUSTOM_URL_BTN: 'פתח',
	SUCCESS_SCREEN_ON: 'המסך הודלק',
	SUCCESS_SCREEN_OFF: 'המסך כובה',
	SUCCESS_FOREGROUND: 'פולי הועבר לקדמה',
	SUCCESS_BACKGROUND: 'פולי הועבר לרקע',
	SUCCESS_APP_LAUNCHED: 'האפליקציה הופעלה',
	SUCCESS_START_URL: 'כתובת הבית נפתחה',
	LOAD_APPS_BTN: 'טען רשימה',
	SELECT_APP_PLACEHOLDER: 'בחר אפליקציה...',
	RECENT_APPS: 'אחרונות',
	APP_SEARCH_PLACEHOLDER: 'חיפוש...',
	NO_RESULTS: 'לא נמצאו תוצאות',

	// טאבים
	TAB_DEVICE: 'מכשיר',
	TAB_NAV: 'ניווט',
	TAB_SCREEN: 'מסך חי',

	// מצב קיוסק — הגדרות (kioskMode)
	KIOSK_MODE_LABEL: 'מצב קיוסק',
	KIOSK_MODE_ENABLED: 'מופעל',
	KIOSK_MODE_DISABLED: 'כבוי',
	KIOSK_MODE_WARNING: '⚠️ כיבוי יסגור את אפליקציית פולי קיוסק',
	CONFIRM_DISABLE_KIOSK: '⚠️ כיבוי מצב קיוסק יסגור את אפליקציית פולי קיוסק!\nהאם להמשיך?',
	SUCCESS_KIOSK_MODE_ON: 'מצב קיוסק הופעל',
	SUCCESS_KIOSK_MODE_OFF: 'מצב קיוסק כובה',

	// נעילה זמנית — lock/unlock (kioskLocked)
	KIOSK_LOCK_LABEL: 'נעילה זמנית',
	KIOSK_LOCK_LOCKED: 'נעול',
	KIOSK_LOCK_UNLOCKED: 'מושהה',
	KIOSK_LOCK_HINT: 'פועל רק כשמצב קיוסק מופעל',

	// Maintenance Mode
	MAINTENANCE_LABEL: 'מצב תחזוקה',
	MAINTENANCE_ON_STATE: 'פעיל',
	MAINTENANCE_OFF_STATE: 'כבוי',
	SUCCESS_MAINTENANCE_ON: 'מצב תחזוקה הופעל',
	SUCCESS_MAINTENANCE_OFF: 'מצב תחזוקה כובה',

	// ווליום
	VOLUME_LABEL: 'עוצמת שמע',
	VOLUME_DOWN: 'הנמך',
	VOLUME_UP: 'הגבה',
	VOLUME_MUTE: 'השתק',
	VOLUME_UNMUTE: 'בטל השתקה',

	// ריסטארט
	RESTART_APP_BTN: 'ריסטארט אפליקציה',
	REBOOT_DEVICE_BTN: 'ריסטארט מכשיר',
	CONFIRM_RESTART_APP: 'להפעיל מחדש את אפליקציית פולי?',
	CONFIRM_REBOOT_DEVICE: '⚠️ האם לאתחל את המכשיר?\nפעולה זו תנתק את החיבור.',
	SUCCESS_RESTART_APP: 'האפליקציה מופעלת מחדש',
	SUCCESS_REBOOT_DEVICE: 'המכשיר מאתחל...',

	// מסך חי
	SCREENSHOT_BTN: 'צלם מסך',
	LIVE_VIEW_START: 'הפעל מסך חי',
	LIVE_VIEW_STOP: 'עצור מסך חי',
	SCREENSHOT_EMPTY: 'לחץ על "צלם מסך" להצגת תמונה',

	// דף שגיאה
	ERROR_PAGE_TITLE: 'הדף לא נמצא',
	ERROR_PAGE_DESCRIPTION: 'הדף שחיפשת לא קיים או שהוסר.',
	ERROR_PAGE_HOME: 'חזרה לדף הראשי',
	ERROR_GENERIC_TITLE: 'שגיאה',
	ERROR_GENERIC_DESCRIPTION: 'משהו השתבש. נסה שוב.',
} as const;
