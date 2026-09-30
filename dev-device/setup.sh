#!/usr/bin/env bash
# הקמת מכשיר-המעבדה על המכונה המאחסנת. מריצים עם sudo.
# ‏ReDroid לא עולה בפודמן ללא-שורש על המכונה הזאת (נמדד: exit 129 בלי לוג);
# כ-root הוא עולה במלואו. ראו README §«מה דורש root».
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "צריך sudo"; exit 1; }
command -v podman >/dev/null || { echo "podman לא מותקן ל-root"; exit 1; }

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA=/var/lib/kiosk-dev-android/data

echo "== 1. מודולי ליבה =="
# ‏loop — אנדרואיד 15 מרכיב כל חבילת APEX דרך loop device. בלעדיו apexd-bootstrap
# נכשל, ו-init מפיל את המערכת בכוונה (reboot_on_failure) בתוך שנייה, עם exit 129.
# ‏dm_mod — device-mapper, נדרש גם הוא במסלול ה-APEX.
for m in loop dm_mod; do modprobe "$m"; done
printf 'loop\ndm_mod\n' > /etc/modules-load.d/kiosk-dev.conf
lsmod | grep -E '^loop|^dm_mod'

echo "== 2. מכשירי binder =="
# ‏binderfs לא נתמכת בקרנל הזה, ולכן המכשירים נקבעים בפרמטר טעינת המודול.
# שמות תקניים = מיפוי שם-לשם בקונטיינר. מופע שני יצריך binder1..6 + אתחול.
printf 'options binder_linux devices=binder,hwbinder,vndbinder\n' > /etc/modprobe.d/binder.conf
printf 'binder_linux\n' > /etc/modules-load.d/binder.conf
printf 'KERNEL=="*binder*", SUBSYSTEM=="misc", MODE="0666"\n' > /etc/udev/rules.d/99-binder.rules
udevadm control --reload

DEVS=(/dev/binder /dev/hwbinder /dev/vndbinder)
missing=0
for d in "${DEVS[@]}"; do [[ -e "$d" ]] || missing=1; done
if [[ $missing -eq 1 ]]; then
	echo "חסר מכשיר — מנסה טעינה מחדש של המודול:"
	lsmod | grep '^binder_linux' || true
	if lsmod | grep -q '^binder_linux'; then
		modprobe -r binder_linux || {
			echo "⚠️  לא ניתן לפרק את binder_linux. הקבצים שנכתבו ייטענו באתחול;"
			echo "   לפני אתחול לבדוק שאין עבודה חיה: podman ps"
			exit 1
		}
	fi
	modprobe binder_linux
	udevadm trigger --subsystem-match=misc || true
	sleep 1
fi
chmod 0666 "${DEVS[@]}"
ls -l "${DEVS[@]}"

echo "== 3. נתונים וקונפיג =="
install -d -m 0755 "$DATA" /etc/kiosk-dev /etc/containers/systemd
install -m 0644 "$HERE/Caddyfile" /etc/kiosk-dev/Caddyfile

echo "== 4. יחידות quadlet =="
install -m 0755 "$HERE/kiosk-dev-route.sh" /usr/local/sbin/kiosk-dev-route.sh
install -m 0644 "$HERE/systemd/kiosk-dev-route.service" /etc/systemd/system/
install -m 0644 "$HERE/quadlet/kiosk-dev.network" /etc/containers/systemd/
sed "s|@DATA@|$DATA|" "$HERE/quadlet/kiosk-dev-android.container" \
	> /etc/containers/systemd/kiosk-dev-android.container
sed "s|@CADDYFILE@|/etc/kiosk-dev/Caddyfile|" "$HERE/quadlet/kiosk-dev-cors.container" \
	> /etc/containers/systemd/kiosk-dev-cors.container
systemctl daemon-reload
# restart ולא start: הסקריפט אידמפוטנטי וצריך להחיל שינויים ביחידות גם כשהן פעילות.
# המחיר: אתחול של המכשיר (~20 שניות) בכל הרצה.
systemctl restart kiosk-dev-android.service
systemctl enable --now kiosk-dev-route.service >/dev/null 2>&1 || true
systemctl restart kiosk-dev-cors.service

echo "== 5. המתנה לאתחול אנדרואיד (עד 3 דקות) =="
# הפורט מאזין מיד (פודמן), ולכן המדד הוא boot_completed מתוך הקונטיינר
for i in $(seq 1 36); do
	if [[ "$(podman exec kiosk-dev-android getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]]; then
		echo "אנדרואיד עלה."
		break
	fi
	sleep 5
	[[ $i -eq 36 ]] && { echo "לא עלה. sudo journalctl -u kiosk-dev-android -n 50 ; sudo dmesg -T | tail -40"; exit 1; }
done

systemctl --no-pager --lines=3 status kiosk-dev-android.service || true
echo
echo "ההמשך (מקונטיינר הסוכנים, יש בו adb): dev-device/provision.sh"
