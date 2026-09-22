#!/usr/bin/env bash
# התקנה והגדרה מלאה של Fully Kiosk על מכשיר-המעבדה — בלי שום צעד ידני.
# מריצים מקונטיינר הסוכנים (יש בו adb) או מהמכונה המאחסנת.
#   ./provision.sh                  — ברירת המחדל
#   ./provision.sh --device-owner   — ראו האזהרה למטה
set -euo pipefail

ADB_TARGET="${ADB_TARGET:-127.0.0.1:5555}"
FULLY_URL="${FULLY_URL:-http://127.0.0.1:2323}"
PW_FILE="${PW_FILE:-/etc/kiosk-dev/remote-admin-password}"
PKG="de.ozerov.fully"
RECEIVER="$PKG/.DeviceOwnerReceiver"
APK_URL="https://www.fully-kiosk.com/files/2026/09/Fully-Kiosk-Browser-v1.61.3.apk"
APK_SHA256="fc0f817928cb53a422aa56ddc726376ab2deb3682bc4e914582c88f5cb4d1019"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APK="${APK:-$HERE/fkb-1.61.3.apk}"
PREFS="/data/data/$PKG/shared_prefs/${PKG}_preferences.xml"
DEVICE_OWNER=0
[[ "${1:-}" == "--device-owner" ]] && DEVICE_OWNER=1

adb() { command adb -s "$ADB_TARGET" "$@"; }

echo "== 1. APK =="
[[ -f "$APK" ]] || curl -fsSL --max-time 300 -o "$APK" "$APK_URL"
echo "$APK_SHA256  $APK" | sha256sum -c -

echo "== 2. חיבור והמתנה לאתחול =="
command adb connect "$ADB_TARGET" >/dev/null
for i in $(seq 1 60); do
	[[ "$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] && break
	sleep 5
	[[ $i -eq 60 ]] && { echo "המכשיר לא השלים אתחול בחמש דקות"; exit 1; }
done
adb root >/dev/null 2>&1 || true   # redroid הוא userdebug; נדרש כדי לכתוב shared_prefs
sleep 2; command adb connect "$ADB_TARGET" >/dev/null
adb shell 'getprop ro.build.version.release; getprop ro.product.cpu.abi'

echo "== 3. סיסמת Remote Admin =="
if [[ -r "$PW_FILE" ]]; then
	PW="$(tr -d '\n' < "$PW_FILE")"
	echo "נקראה מ-$PW_FILE"
else
	PW="${FULLY_PASSWORD:-$(openssl rand -hex 12)}"
	if sudo -n install -d -m 0750 /etc/kiosk-dev 2>/dev/null &&
	   printf '%s\n' "$PW" | sudo -n tee "$PW_FILE" >/dev/null 2>&1; then
		sudo -n chmod 0640 "$PW_FILE"; echo "נוצרה ונשמרה ב-$PW_FILE"
	else
		echo "נוצרה (לא ניתן לשמור ב-$PW_FILE): $PW"
	fi
fi

echo "== 4. התקנה (-g: כל הרשאות הריצה מאושרות מראש) =="
adb install -r -g "$APK"
adb shell "am start -n $PKG/.MainActivity" >/dev/null; sleep 6   # יצירת תיקיית הנתונים

echo "== 4a. הרשאות מיוחדות (app-ops) =="
# 🔴 אלה **אינן** הרשאות-ריצה, ולכן `install -g` אינו נוגע בהן — ובלעדיהן Fully
#    מבקש הרשאות על המסך בהפעלה הראשונה. הן גם **אינן דורשות device-owner**:
#    עד 22/09 הן ישבו בתוך `if DEVICE_OWNER`, וריצה בלי הדגל השאירה את המכשיר
#    מבקש הרשאות (נצפה: GET_USAGE_STATS ו-MANAGE_EXTERNAL_STORAGE עם rejectTime).
# 🛑 חייב לקרות **לפני** סעיף 5 (הדלקת Remote Admin) — ראו ההערה שם.
for op in MANAGE_EXTERNAL_STORAGE SYSTEM_ALERT_WINDOW GET_USAGE_STATS WRITE_SETTINGS REQUEST_INSTALL_PACKAGES; do
	adb shell "appops set $PKG $op allow" >/dev/null 2>&1 || true
done
adb shell "cmd notification allow_listener $PKG/de.ozerov.fully.NotificationService" >/dev/null 2>&1 || true
adb shell "dumpsys deviceidle whitelist +$PKG" >/dev/null 2>&1 || true
for op in MANAGE_EXTERNAL_STORAGE GET_USAGE_STATS; do
	printf "  %-26s " "$op"
	adb shell "cmd appops get $PKG $op" 2>/dev/null | head -1 | tr -d "\r"
done

if [[ $DEVICE_OWNER -eq 1 ]]; then
	echo "== 4b. device owner (מתכון ה-ADB מהרנבוק provision-kiosk-tablet-via-adb) =="
	# 🛑 דורש **יציאה לאינטרנט מהמכשיר**: קוד ה-provisioning נפתר מול הענן של Fully.
	#    בלי רשת: "Getting provisioning profile failed due to some network issue",
	#    והמכשיר נשאר תקוע ב-ProvisioningActivity. ‏SKIP גם אינו יוצא ממנו.
	# 🛑 הסדר קריטי: זה חייב לקרות **לפני** הדלקת Remote Admin. ברגע שהיא נדלקת Fully
	#    רושם את de.ozerov.fully/.MyDeviceAdmin, ואז set-device-owner נכשל
	#    ב-"Unknown admin: …DeviceOwnerReceiver". התנאי הנוסף: אפס חשבונות (dumpsys account).
	adb shell "dpm set-device-owner $RECEIVER" || echo "⚠️ set-device-owner לא עבר"
	adb shell "am start -n $PKG/de.ozerov.fully.ProvisioningActivity --es FULLY_PROVISIONING_CODE FFF" >/dev/null 2>&1 || true
	sleep 8
fi

echo "== 5. הדלקת Remote Admin ישירות בהעדפות =="
# אין ל-Fully נתיב adb להדלקת Remote Admin, וה-REST עוד לא קיים כדי להדליק את עצמו.
# הפתרון: לכתוב את המפתחות ל-shared_prefs (שמותיהם חולצו מה-dex של ה-APK).
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
adb shell "cat $PREFS" > "$TMP/prefs.xml" 2>/dev/null || printf '%s\n' "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>" '<map>' '</map>' > "$TMP/prefs.xml"
PW="$PW" python3 - "$TMP/prefs.xml" <<'PY'
import os, re, sys
p = sys.argv[1]
s = open(p, encoding='utf-8', errors='replace').read()
if '<map>' not in s:
    s = "<?xml version='1.0' encoding='utf-8' standalone='yes' ?>\n<map>\n</map>\n"
want = {'remoteAdmin': True, 'remoteAdminLan': True,
        'remoteAdminScreenshot': True, 'remoteAdminFileManagement': True}
for k, v in want.items():
    s = re.sub(r'\s*<boolean name="%s"[^/]*/>' % k, '', s)
    s = s.replace('</map>', '    <boolean name="%s" value="%s" />\n</map>' % (k, str(v).lower()))
s = re.sub(r'\s*<string name="remoteAdminPassword">.*?</string>', '', s, flags=re.S)
s = s.replace('</map>', '    <string name="remoteAdminPassword">%s</string>\n</map>' % os.environ['PW'])
open(p, 'w', encoding='utf-8').write(s)
PY
adb push "$TMP/prefs.xml" /data/local/tmp/prefs.xml >/dev/null
adb shell "U=\$(stat -c %u $PREFS 2>/dev/null || echo 10087); cp /data/local/tmp/prefs.xml $PREFS && chown \$U:\$U $PREFS && chmod 660 $PREFS && rm /data/local/tmp/prefs.xml"
adb shell "am force-stop $PKG" >/dev/null 2>&1 || true
adb shell "am start -n $PKG/.MainActivity" >/dev/null

echo "== 6. המתנה ל-REST =="
for i in $(seq 1 24); do
	[[ "$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$FULLY_URL/" 2>/dev/null)" == "200" ]] && { echo "‏REST חי."; break; }
	sleep 5
	[[ $i -eq 24 ]] && { echo "‏REST לא עלה. adb logcat -d | grep -i fully"; exit 1; }
done

echo "== 7. שרידות אתחול =="
# בלי launchOnBoot, כל restart של הקונטיינר מוריד את ה-REST עד הפעלה ידנית של האפליקציה.
for k in launchOnBoot keepScreenOn; do
	printf '  %-14s ' "$k"
	curl -sS --max-time 10 "$FULLY_URL/?cmd=setBooleanSetting&key=$k&value=true&type=json&password=$PW" | head -c 90; echo
done

echo "== 8. הגדרות הפרויקט =="
node "$HERE/../scripts/configure-fully-device.mjs" "$FULLY_URL" "$PW"

echo "== 9. אימות =="
curl -sS --max-time 8 "$FULLY_URL/?cmd=getDeviceInfo&type=json&password=$PW" | head -c 260; echo
echo
echo "המכשיר מוכן. בממשק הניהול להזין:  http://localhost:12323   (או ה-hostname שמאחורי Access)"
