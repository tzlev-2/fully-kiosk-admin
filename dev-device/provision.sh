#!/usr/bin/env bash
# התקנה והקצאה מלאה של Fully Kiosk (בניית EMM) על מכשיר — **בלי root כלל**.
# כל הפקודות רצות כ-uid=2000(shell) דרך adb. אין `adb root`, אין כתיבה ל-shared_prefs.
#
#   ./provision.sh                     — מכשיר-המעבדה (127.0.0.1:5555)
#   ADB_TARGET=10.8.0.7:5555 ./provision.sh
#
# 🛑 המכשיר חייב להיות **נקי**: בלי Fully מותקן ובלי device-owner קיים.
#    על הקונטיינר: עוצרים את היחידה, מוחקים /var/lib/kiosk-dev-android/data, מפעילים.
set -euo pipefail

ADB_TARGET="${ADB_TARGET:-127.0.0.1:5555}"
FULLY_URL="${FULLY_URL:-http://127.0.0.1:2323}"
PW_FILE="${PW_FILE:-/etc/kiosk-dev/remote-admin-password}"
PKG="com.fullykiosk.emm"
RECEIVER="$PKG/de.ozerov.fully.DeviceOwnerReceiver"
# 🔑 בניית ה-EMM בלבד. התבנית באתר: אותה כתובת כמו הבנייה הרגילה + "-emm" לפני הסיומת.
APK_URL="https://www.fully-kiosk.com/files/2026/09/Fully-Kiosk-Browser-v1.61.3-emm.apk"
APK_SHA256="98906df3fd1fb7803d1270ede978e4744b108ef5dca8ad4119889d20e3ad0104"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APK="${APK:-$HERE/fkb-emm-1.61.3.apk}"
SETTINGS_SRC="${SETTINGS_SRC:-$HERE/../src/lib/provisioning/fully-settings.json}"
SERVE_PORT="${SERVE_PORT:-8790}"
# קוד הקצאה: FFF = ללא ענן. קוד מפרופיל ב-Fully Cloud רושם את המכשיר לחשבון
# ומאפשר Remote Admin מכל מקום (ADVANCED). ⚠️ גם עם קוד ענן חייבים להעביר
# FULLY_SETTINGS_DOWNLOAD_LOCATION במפורש — settings_url שבפרופיל לא נמשך (נמדד).
PROV_CODE="${PROV_CODE:-FFF}"

adb() { command adb -s "$ADB_TARGET" "$@"; }

echo "== 1. APK (EMM) =="
[[ -f "$APK" ]] || curl -fsSL --max-time 300 -o "$APK" "$APK_URL"
echo "$APK_SHA256  $APK" | sha256sum -c -

echo "== 2. חיבור והמתנה לאתחול =="
command adb connect "$ADB_TARGET" >/dev/null
for i in $(seq 1 60); do
	[[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] && break
	sleep 5
	[[ $i -eq 60 ]] && { echo "המכשיר לא השלים אתחול בחמש דקות"; exit 1; }
done
echo -n "  uid: "; adb shell id | tr -d '\r'
adb shell 'getprop ro.build.version.release; getprop ro.product.cpu.abi' | tr -d '\r'

echo "== 2a. בדיקת-סף: המכשיר חייב להיות נקי =="
if adb shell "pm list packages" | tr -d '\r' | grep -q "$PKG"; then
	echo "🛑 $PKG כבר מותקן. Fully רושם 'provisioning finished' ומסרב להקצאה נוספת;" >&2
	echo "   הסרה אינה אפשרית כשהוא device-owner. יש לנגב את המכשיר ולהריץ שוב." >&2
	exit 1
fi

echo "== 3. סיסמת Remote Admin =="
# 🔴 בלי סיסמה Fully אינו מפעיל את Remote Admin ("Please set the Remote Admin Password first"),
#    וה-REST לא יעלה — גם כש-remoteAdmin=true. הסיסמה **חייבת** להיות בקובץ ההגדרות.
if [[ -r "$PW_FILE" ]]; then
	PW="$(tr -d '\n' < "$PW_FILE")"; echo "נקראה מ-$PW_FILE"
else
	PW="${FULLY_PASSWORD:-$(openssl rand -hex 12)}"
	if sudo -n install -d -m 0750 "$(dirname "$PW_FILE")" 2>/dev/null &&
	   printf '%s\n' "$PW" | sudo -n tee "$PW_FILE" >/dev/null 2>&1; then
		sudo -n chmod 0640 "$PW_FILE"; echo "נוצרה ונשמרה ב-$PW_FILE"
	else
		echo "נוצרה (לא ניתן לשמור ב-$PW_FILE): $PW"
	fi
fi

echo "== 4. הגשת קובץ ההגדרות =="
# ⚠️ הנתיב **חייב** להסתיים ב-.json — Fully מסיק את סוג הקובץ מהסיומת.
# ⚠️ המכשיר בקונטיינר אינו יכול לפנות ל-gateway של הרשת: ה-input chain ב-nftables
#    הוא policy drop ופותח רק 22. לכן הגשה מ-127.0.0.1 + מנהרה ציבורית, לא מה-gateway.
SERVE_DIR="$(mktemp -d)"; trap 'rm -rf "$SERVE_DIR"; [[ -n "${SERVE_PID:-}" ]] && kill "$SERVE_PID" 2>/dev/null || true' EXIT
if [[ ! -r "$SETTINGS_SRC" ]]; then
	echo "🛑 חסר קובץ ההגדרות: $SETTINGS_SRC" >&2
	echo "   הוא חי ב-main (‏src/lib/provisioning/fully-settings.json). על ענף ישן:" >&2
	echo "   git show main:src/lib/provisioning/fully-settings.json > /tmp/fully-settings.json" >&2
	echo "   ואז: SETTINGS_SRC=/tmp/fully-settings.json ./provision.sh" >&2
	exit 1
fi
PW="$PW" python3 - "$SETTINGS_SRC" "$SERVE_DIR/fully-settings.json" <<'PY'
import json, os, sys
d = json.load(open(sys.argv[1], encoding='utf-8'))
d['remoteAdminPassword'] = os.environ['PW']     # ← המפתח שהיה חסר; בלעדיו אין REST
d['remoteAdmin'] = True
d['remoteAdminLan'] = True
d['enableLocalhost'] = True
# 🔴 בלי זה יש סיכון ש-Fully יכבה ADB בהקצאה ותיחסם הגישה למכשיר (נצפה: adb_enabled=0)
d['mdmDisableADB'] = False
# 🔑 מבטל את כפתור CONTINUE בסוף ההקצאה ⇒ אפס נגיעות במסך.
# הוא נקרא מתוך הקובץ המיובא, וההקצאה ממשיכה לבדה ל-'Continue device setup'.
d['skipLaunchButtonInProvisioning'] = True
json.dump(d, open(sys.argv[2], 'w', encoding='utf-8'))
print("  מפתחות:", len(d))
PY
# ⚠️ הקובץ המוגש מכיל את סיסמת ה-Remote Admin. נקשר לכתובת אחת בלבד,
#    והשרת נהרג ב-trap בסוף הריצה.
python3 -m http.server "$SERVE_PORT" --bind "${SERVE_ADDR:-0.0.0.0}" --directory "$SERVE_DIR" >/dev/null 2>&1 &
SERVE_PID=$!
sleep 1
# 🛑 הכתובת חייבת להיות כזו שה**מכשיר** מגיע אליה. ‏127.0.0.1 היא הלולאה של
#    המכונה שמריצה כאן, ו-Fully מפעיל שרת-localhost משלו שחוטף את הכתובת —
#    כלומר טעות כאן אינה נכשלת בבירור אלא מחזירה זבל.
if [[ -z "${SETTINGS_URL:-}" ]]; then
	DEV_GW="$(adb shell 'ip route | grep default' 2>/dev/null | tr -d '\r' | awk '{print $3}' | head -1)"
	DEV_NET="$(adb shell 'ip -4 addr show eth0 2>/dev/null || ip -4 addr show wlan0' 2>/dev/null | tr -d '\r' | grep -oE 'inet [0-9.]+/[0-9]+' | head -1 | cut -d' ' -f2)"
	# הכתובת של המכונה הזאת שנמצאת באותה רשת כמו המכשיר
	SERVE_ADDR="$(ip -4 -o addr show 2>/dev/null | awk '{print $4}' | while read c; do
		[[ -n "$DEV_NET" ]] && python3 - "$c" "$DEV_NET" <<-'PY' 2>/dev/null
		import ipaddress, sys
		a, b = ipaddress.ip_interface(sys.argv[1]), ipaddress.ip_interface(sys.argv[2])
		if a.ip in b.network: print(a.ip)
		PY
	done | head -1)"
	[[ -z "$SERVE_ADDR" && -n "$DEV_GW" ]] && SERVE_ADDR="$DEV_GW"
	if [[ -z "$SERVE_ADDR" ]]; then
		echo "🛑 לא הצלחתי לקבוע כתובת שהמכשיר יגיע אליה (רשת המכשיר: ${DEV_NET:-לא ידועה})." >&2
		echo "   להעביר במפורש, למשל כתובת מנהרה:  SETTINGS_URL=https://<host>/fully-settings.json ./provision.sh" >&2
		exit 1
	fi
	SETTINGS_URL="http://$SERVE_ADDR:$SERVE_PORT/fully-settings.json"
else
	# כתובת חיצונית סופקה (מנהרה) — המנהרה מתחברת מקומית, ולכן נשארים על
	# הלולאה ולא חושפים את הקובץ (ובו הסיסמה) לרשת.
	SERVE_ADDR="127.0.0.1"
fi
echo "  מוגש ב-$SETTINGS_URL"

echo "== 4a. בדיקת-סף: המכשיר מגיע לכתובת? =="
# 🔴 להקצאה יש **זריקה אחת** לכל התקנה. כתובת שהמכשיר לא מגיע אליה שורפת אותה,
#    והתסמין ("Settings file download failed") מופיע רק אחרי set-device-owner.
PF_HOST="$(printf '%s' "$SETTINGS_URL" | sed -E 's#^https?://##; s#[:/].*$##')"
PF_PORT="$(printf '%s' "$SETTINGS_URL" | sed -nE 's#^https?://[^:/]+:([0-9]+).*#\1#p')"
[[ -z "$PF_PORT" ]] && { [[ "$SETTINGS_URL" == https://* ]] && PF_PORT=443 || PF_PORT=80; }
if adb shell "nc -w 4 $PF_HOST $PF_PORT </dev/null" >/dev/null 2>&1; then
	echo "  ✅ המכשיר מגיע ל-$PF_HOST:$PF_PORT"
else
	echo "🛑 המכשיר **אינו** מגיע ל-$PF_HOST:$PF_PORT — עוצר לפני שנשרפת ההקצאה." >&2
	echo "   מכשיר-מעבדה בקונטיינר: chain input ב-nftables הוא policy drop ופותח רק 22," >&2
	echo "   ולכן פנייה ל-gateway של המאחסן נחסמת. להגיש מקונטיינר על רשת kiosk-dev," >&2
	echo "   או להעביר SETTINGS_URL של מנהרה ציבורית." >&2
	exit 1
fi

echo "== 5. התקנה — ובלי להפעיל את האפליקציה =="
# 🛑 אסור `am start` לפני סעיף 7. פתיחת Fully לפני ההקצאה הורסת את DeviceOwnerReceiver.
adb install -r -g "$APK"
adb shell "dumpsys package $PKG | grep -o 'notLaunched=[a-z]*'" | tr -d '\r'

echo "== 6. הרשאות מיוחדות (app-ops) =="
# אינן הרשאות-ריצה, ולכן `install -g` אינו נוגע בהן, והן **אינן דורשות device-owner**.
# 🔑 SCHEDULE_EXACT_ALARM ו-REQUEST_INSTALL_PACKAGES הם אלה שעצרו את ההקצאה במסך
#    "Press Get Permissions button" — בלעדיהם Fully לא מגיע ל-CONTINUE.
for op in MANAGE_EXTERNAL_STORAGE SYSTEM_ALERT_WINDOW GET_USAGE_STATS WRITE_SETTINGS \
          PROJECT_MEDIA REQUEST_INSTALL_PACKAGES SCHEDULE_EXACT_ALARM; do
	adb shell "appops set $PKG $op allow" >/dev/null 2>&1 || true
done
# שם הרכיב הוא NotificationService — לא MyNotificationListener. שם שגוי נכשל **בשקט**.
adb shell "cmd notification allow_listener $PKG/de.ozerov.fully.NotificationService" >/dev/null 2>&1 || true
sleep 1   # ההגדרה לא נקראת מיד אחרי הכתיבה — בלי זה האימות למטה מדווח null בשקר
adb shell "dumpsys deviceidle whitelist +$PKG" >/dev/null 2>&1 || true
adb shell "appops get $PKG" | tr -d '\r' | grep -cE ': allow' | sed 's/^/  app-ops מאושרים: /'
adb shell 'settings get secure enabled_notification_listeners' | tr -d '\r' | sed 's/^/  listener: /'

echo "== 7. device owner =="
# ⚠️ הפקודה הזו **מפעילה בעצמה את ProvisioningActivity** עם intent ריק, ולכן היא
#    שורפת את ה-onCreate היחיד. זה מה שמייצר "Got unexpected intent null".
#    התשובה אינה סדר אחר אלא הדגלים בסעיף 8.
adb shell "dpm set-device-owner $RECEIVER" | tr -d '\r'

echo "== 8. ההקצאה — CLEAR_TASK כדי לקבל onCreate טרי =="
# 🔑 0x1c008000 = NEW_TASK|CLEAR_TASK|CLEAR_TOP. בלי זה האקטיביטי הוא singleTask,
#    ה-intent מגיע ל-onNewIntent, ו-Fully קורא extras **רק ב-onCreate**.
#    עם זה אפשר לחזור על הצעד הזה שוב ושוב בלי לנגב את המכשיר.
adb shell "am start -n $PKG/de.ozerov.fully.ProvisioningActivity -f 0x1c008000 \
	--es FULLY_PROVISIONING_CODE "$PROV_CODE" \
	--es FULLY_SETTINGS_DOWNLOAD_LOCATION '$SETTINGS_URL'" >/dev/null
sleep 12
adb logcat -d 2>/dev/null | grep -E 'ProvisioningActivity:|Settings imported' | tr -d '\r' | tail -8

echo "== 8a. גיבוי: לחיצת CONTINUE =="
# עם skipLaunchButtonInProvisioning=true הכפתור לא אמור להופיע כלל, וההקצאה
# מסתיימת לבדה. הבלוק הזה הוא רשת-ביטחון לבניות/גרסאות שבהן הוא כן מופיע.
if adb logcat -d 2>/dev/null | grep -q "Continue device setup"; then
	echo "  ✅ ההקצאה הסתיימה לבדה — אין צורך בהקשה"
else
# ‏ProvisioningActivity **אינה מסיימת את עצמה**. עד שלא נלחץ CONTINUE, MainActivity
# מדווחת "Restarting incomplete provisioning" ומקפיצה חזרה — לולאה אינסופית.
# 🛑 `uiautomator dump` דוגם **רק את החלון הממוקד**. הדיאלוג
#    ImmersiveModeConfirmation ("Viewing full screen / Got it") עולה מעל Fully
#    ומסתיר את הכפתור לגמרי — הדאמפ יחזור בלי CONTINUE ובלי שגיאה.
#    לכן: מחפשים גם את "Got it", ולוחצים עליו קודם. אפס קואורדינטות קשיחות.
find_button() {
	adb shell 'uiautomator dump /sdcard/ui.xml' >/dev/null 2>&1 || return 1
	adb shell 'cat /sdcard/ui.xml' 2>/dev/null | tr -d '\r' | python3 -c "
import re, sys
s = sys.stdin.read()
for label in ('Got it', 'CONTINUE', 'GET PERMISSIONS'):
    m = re.search(r'text=\"%s\"[^>]*bounds=\"\[(\d+),(\d+)\]\[(\d+),(\d+)\]\"' % label, s)
    if m:
        x1, y1, x2, y2 = map(int, m.groups())
        print(label, (x1 + x2) // 2, (y1 + y2) // 2)
        break
"
}
for attempt in 1 2 3 4 5 6; do
	XY="$(find_button)" || true
	if [ -z "$XY" ]; then
		echo "  אין כפתור מזוהה (ניסיון $attempt) · focus: $(adb shell 'dumpsys window | grep -o "mCurrentFocus=.*"' | tr -d '\r')"
		sleep 3; continue
	fi
	LABEL="${XY% * *}"; REST="${XY#* }"; X="${REST% *}"; Y="${REST#* }"
	echo "  לוחץ '$LABEL' ב-($X,$Y)"
	adb shell "input tap $X $Y" >/dev/null 2>&1
	sleep 5
	case "$LABEL" in
		"Got it")           ;;                       # רק סילקנו דיאלוג — לחפש שוב
		"CONTINUE")
			adb logcat -d 2>/dev/null | grep -q 'Continue device setup' && { echo "  ✅ Continue device setup"; break; }
			;;                                        # לפעמים ההקשה הראשונה לא נרשמת — ננסה שוב
		"GET PERMISSIONS")  adb shell 'input keyevent 4' >/dev/null 2>&1; sleep 3 ;;
	esac
done

fi

echo "== 9. הפעלת Fully =="
adb shell "am start -n $PKG/de.ozerov.fully.MainActivity" >/dev/null
for i in $(seq 1 24); do
	adb shell 'netstat -ltn 2>/dev/null' | grep -q ':2323' && { echo "  2323 מאזין."; break; }
	sleep 5
	[[ $i -eq 24 ]] && { echo "‏REST לא עלה. adb logcat -d | grep -iE 'Provisioning|Remote admin'"; exit 1; }
done

echo "== 10. אימות =="
# האימות שתמיד עובד — מהמכשיר עצמו, בלי להניח שיש מסלול רשת מכאן אליו.
adb shell "netstat -ltn 2>/dev/null | grep 2323" | tr -d '\r' | sed 's/^/  /'
adb shell "dumpsys device_policy | grep -A1 'Device Owner:'" | tr -d '\r' | sed 's/^/  /' | head -2

# ⚠️ ‏FULLY_URL הוא ברירת-מחדל שנכונה רק כשמריצים מהמכונה שמארחת את המכשיר.
#    מ-srv1812097 מול מכשיר-המעבדה, למשל, הפרוקסי הוא 127.0.0.1:12323.
if curl -sS --max-time 8 -o /dev/null -G "$FULLY_URL/" \
	--data-urlencode cmd=deviceInfo --data-urlencode "password=$PW" --data-urlencode type=json 2>/dev/null; then
	curl -sS --max-time 8 -G "$FULLY_URL/" \
		--data-urlencode cmd=deviceInfo --data-urlencode "password=$PW" --data-urlencode type=json | head -c 300; echo
else
	echo "  ⚠️ אין מסלול מכאן ל-$FULLY_URL — זה **אינו** אומר שהמכשיר תקול."
	echo "     ‏2323 מאזין עליו (ראו למעלה). לאמת מבחוץ:  FULLY_URL=http://<ip>:2323 ./provision.sh"
fi
echo
echo "המכשיר מוכן. סיסמת Remote Admin ב-$PW_FILE"
