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
json.dump(d, open(sys.argv[2], 'w', encoding='utf-8'))
print("  מפתחות:", len(d))
PY
python3 -m http.server "$SERVE_PORT" --bind 127.0.0.1 --directory "$SERVE_DIR" >/dev/null 2>&1 &
SERVE_PID=$!
sleep 1
SETTINGS_URL="${SETTINGS_URL:-http://127.0.0.1:$SERVE_PORT/fully-settings.json}"
echo "  מוגש ב-$SETTINGS_URL (‏SETTINGS_URL לדריסה, למשל כתובת מנהרה)"

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

echo "== 8a. לחיצת CONTINUE =="
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

echo "== 9. הפעלת Fully =="
adb shell "am start -n $PKG/de.ozerov.fully.MainActivity" >/dev/null
for i in $(seq 1 24); do
	adb shell 'netstat -ltn 2>/dev/null' | grep -q ':2323' && { echo "  2323 מאזין."; break; }
	sleep 5
	[[ $i -eq 24 ]] && { echo "‏REST לא עלה. adb logcat -d | grep -iE 'Provisioning|Remote admin'"; exit 1; }
done

echo "== 10. אימות מבחוץ =="
curl -sS --max-time 8 -G "$FULLY_URL/" \
	--data-urlencode cmd=deviceInfo --data-urlencode "password=$PW" --data-urlencode type=json \
	| head -c 300; echo
echo
echo "המכשיר מוכן. סיסמת Remote Admin ב-$PW_FILE"
