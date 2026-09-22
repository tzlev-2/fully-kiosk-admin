/**
 * מגיש את קובץ ההגדרות של Fully Kiosk לפריסת מכשיר.
 *
 * ‏Fully מוריד מכאן ב-provisioning. ⚠️ הנתיב **חייב** להסתיים ב-.json —
 * ‏Fully מסיק את סוג הקובץ מהסיומת ודוחה אחרת ("JSON file must be in JSON format"):
 *   am start -n com.fullykiosk.emm/de.ozerov.fully.ProvisioningActivity \
 *     --es FULLY_SETTINGS_DOWNLOAD_LOCATION "https://<host>/provision/fully-settings.json?token=<TOKEN>"
 *
 * הקונפיג עצמו יושב בריפו **בלי סודות**; הערכים המוצפנים (סיסמת Remote Admin,
 * ‏PIN של הקיוסק) מוזרקים כאן מ-secret. ‏`*Enc` של Fully הוא הצפנה הפיכה עם
 * מפתח שמוטמע ב-APK — כלומר שווה-ערך לסיסמה, ולכן אינו נכנס לגיט.
 */
import settings from '../../src/lib/provisioning/fully-settings.json';

interface Env {
	PROVISION_TOKEN: string;
	FULLY_SECRETS: string;
}

/** השוואה בזמן קבוע — לא לדלוף את אורך/תוכן הטוקן דרך זמן התגובה */
function safeEqual(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let diff = 0;
	for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
	return diff === 0;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
	const token = new URL(request.url).searchParams.get('token') ?? '';
	if (!env.PROVISION_TOKEN || !safeEqual(token, env.PROVISION_TOKEN)) {
		return new Response('Not found\n', { status: 404 });
	}

	let secrets: Record<string, string> = {};
	try {
		secrets = env.FULLY_SECRETS ? JSON.parse(env.FULLY_SECRETS) : {};
	} catch {
		return new Response('FULLY_SECRETS is not valid JSON\n', { status: 500 });
	}

	return new Response(JSON.stringify({ ...settings, ...secrets }), {
		headers: {
			'content-type': 'application/json; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
};
