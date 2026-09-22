#!/data/data/com.termux/files/usr/bin/bash
# פריסת Caddy CORS Proxy + kiosk-restart-server כשירותי runit ב-Termux.
#
# רץ *על המכשיר*, בתוך Termux. הקבצים Caddyfile ו-kiosk-restart-server.js
# נלקחים מהתיקייה שליד הסקריפט — לכן מעתיקים את התיקייה כולה:
#   scp -P 8022 -r termux-proxy-server u@<ip>:~/ && ssh ... 'bash ~/termux-proxy-server/setup.sh'

set -euo pipefail

die() { echo "✗ $*" >&2; exit 1; }

# --- סביבה ---
[ -n "${PREFIX:-}" ] && [ -x "$PREFIX/bin/sh" ] || die "הסקריפט חייב לרוץ בתוך Termux (PREFIX לא מוגדר)"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_DIR="$HOME/.config/kiosk-proxy"
LOG_DIR="$PREFIX/var/log/sv"
SHELL_BIN="$PREFIX/bin/sh"
BOOT_DIR="$HOME/.termux/boot"
SERVICES="caddy kiosk-restart sshd"

# sv/sv-enable קוראים את SVDIR מהסביבה; ב-shell לא-אינטראקטיבי (SSH) הוא ריק
export SVDIR="$PREFIX/var/service"

for f in Caddyfile kiosk-restart-server.js web/enable-kiosk-mode.html; do
	[ -f "$SCRIPT_DIR/$f" ] || die "חסר $f ליד הסקריפט ($SCRIPT_DIR) — להעתיק את התיקייה כולה"
done

echo "=== התקנת חבילות ==="
# dpkg שואל על conffiles (למשל openssl.cnf) ונופל כש-stdin סגור — לכן הדגלים
APT_OPTS="-o Dpkg::Options::=--force-confold -o Dpkg::Options::=--force-confdef"
export DEBIAN_FRONTEND=noninteractive
pkg update -y
pkg install -y $APT_OPTS caddy nodejs termux-services openssh
# ‏bootstrap טרי מגיע עם openssl ישן מדי ל-node:
#   CANNOT LINK EXECUTABLE "node": cannot locate symbol "OSSL_PROVIDER_add_conf_parameter"
pkg upgrade -y $APT_OPTS openssl nodejs || echo "  ⚠ pkg upgrade החזיר שגיאה — ממשיך ובודק את node עצמו"
node --version >/dev/null 2>&1 || die "node לא רץ אחרי ההתקנה: $(node --version 2>&1 | head -1)"

echo "=== קונפיגורציה: $CONFIG_DIR ==="
mkdir -p "$CONFIG_DIR"
# מקור-אמת יחיד: הקבצים שבריפו, לא עותק מוטמע בסקריפט
cp "$SCRIPT_DIR/Caddyfile" "$CONFIG_DIR/Caddyfile"
cp "$SCRIPT_DIR/kiosk-restart-server.js" "$CONFIG_DIR/kiosk-restart-server.js"
# node עדכני מזהה ESM לבד, אבל בגרסאות ישנות import ב-.js נופל
printf '{"type":"module"}\n' > "$CONFIG_DIR/package.json"
# web/ — דפים שמוגשים למכשיר עצמו (enable-kiosk-mode.html)
rm -rf "$CONFIG_DIR/web"
cp -r "$SCRIPT_DIR/web" "$CONFIG_DIR/web"
echo "  ✓ Caddyfile · kiosk-restart-server.js · package.json · web/"

caddy validate --config "$CONFIG_DIR/Caddyfile" >/dev/null 2>&1 \
	|| die "Caddyfile לא תקין — caddy validate נכשל"
echo "  ✓ caddy validate"

# --- שירותי runit ---
make_service() {
	local name="$1" cmd="$2"
	mkdir -p "$SVDIR/$name/log" "$LOG_DIR/$name"
	printf '#!%s\nexec %s 2>&1\n' "$SHELL_BIN" "$cmd"            > "$SVDIR/$name/run"
	printf '#!%s\nexec svlogd -tt %s\n' "$SHELL_BIN" "$LOG_DIR/$name" > "$SVDIR/$name/log/run"
	chmod +x "$SVDIR/$name/run" "$SVDIR/$name/log/run"
	rm -f "$SVDIR/$name/down"   # זה מה ש-sv-enable עושה: מאפשר הפעלה אוטומטית
	echo "  ✓ $name"
}

echo "=== יצירת שירותים ==="
make_service caddy         "caddy run --config $CONFIG_DIR/Caddyfile"
make_service kiosk-restart "node $CONFIG_DIR/kiosk-restart-server.js"

# --- sshd: מסלול-חילוץ כשה-adb נופל ---
# ‏termux-services כבר מביא שירות sshd מוכן, אז מפעילים אותו ולא בונים אחד.
sv-enable sshd >/dev/null 2>&1 || true
echo "  ✓ sshd (פורט 8022)"

# 🔴 ‏OpenSSH מסרב לאימות-מפתח כש-$HOME ניתן לכתיבה לקבוצה/לכולם (StrictModes),
#    והכשל נראה כ-"Permission denied (publickey)" בלי שום רמז. ‏$HOME שנוצר
#    ב-mkdir תחת umask מתירני (למשל בהקמה חסרת-מסך דרך run-as) יוצא 777.
chmod 700 "$HOME"
[ -d "$HOME/.ssh" ] && chmod 700 "$HOME/.ssh"
[ -f "$HOME/.ssh/authorized_keys" ] && chmod 600 "$HOME/.ssh/authorized_keys"

# מפתח ציבורי שמונח ליד הסקריפט מותקן אוטומטית; אחרת מדווחים ולא ממציאים מפתח.
if [ -f "$SCRIPT_DIR/authorized_keys" ]; then
	mkdir -p "$HOME/.ssh"; chmod 700 "$HOME/.ssh"
	cp "$SCRIPT_DIR/authorized_keys" "$HOME/.ssh/authorized_keys"
	chmod 600 "$HOME/.ssh/authorized_keys"
	echo "  ✓ authorized_keys הותקן"
elif [ -s "$HOME/.ssh/authorized_keys" ]; then
	echo "  ✓ authorized_keys קיים ($(wc -l < "$HOME/.ssh/authorized_keys" | tr -d ' ') מפתחות)"
else
	echo "  ⚠ אין authorized_keys — ‏ssh לא יעבוד. הניחו קובץ authorized_keys ליד הסקריפט והריצו שוב."
fi

# --- שרידות reboot ---
echo "=== Termux:Boot ==="
mkdir -p "$BOOT_DIR"
cat > "$BOOT_DIR/start-services.sh" << BOOTEOF
#!$SHELL_BIN
termux-wake-lock
runsvdir -P $SVDIR
BOOTEOF
chmod +x "$BOOT_DIR/start-services.sh"
echo "  ✓ $BOOT_DIR/start-services.sh"

if pm list packages 2>/dev/null | grep -q '^package:com.termux.boot$'; then
	echo "  ✓ אפליקציית Termux:Boot מותקנת"
else
	echo "  ⚠ אפליקציית Termux:Boot (com.termux.boot) אינה מותקנת —"
	echo "    השירותים לא יעלו אחרי אתחול. להתקין מ-F-Droid ולהריץ אותה פעם אחת."
fi

# --- הפעלה ---
echo "=== הפעלת שירותים ==="
if ! pgrep -f "runsvdir.*$SVDIR" >/dev/null 2>&1; then
	echo "  ⚠ runsvdir אינו רץ — מפעיל ברקע"
	nohup runsvdir -P "$SVDIR" >/dev/null 2>&1 &
fi

for s in $SERVICES; do
	# runsvdir סורק כל ~5 שניות; עד שהוא יוצר supervise/ אי אפשר לדבר עם השירות
	i=0
	until sv status "$s" >/dev/null 2>&1 || [ "$i" -ge 15 ]; do sleep 2; i=$((i+1)); done
	sv status "$s" >/dev/null 2>&1 || die "$s לא נקלט ע\"י runsvdir"
	sv restart "$s" >/dev/null 2>&1 || true   # אם כבר רץ — לטעון קונפיג חדש
done

# --- אימות ---
echo "=== אימות ==="
PORT="${PROXY_PORT:-8765}"

# ממתינים ל-/status ולא ל-/ping: ‏/ping נענה ע"י Caddy לבדו, ולכן עובר גם
# כששרת ה-node עדיין עולה — זה מייצר כשל-שווא באימות שבא אחריו.
i=0
until curl -s -m 3 "localhost:$PORT/status" 2>/dev/null | grep -q '"alive"' || [ "$i" -ge 15 ]; do
	sleep 2; i=$((i+1))
done

fail=0
[ "$(curl -s -m 3 "localhost:$PORT/ping" 2>/dev/null)" = "pong" ] \
	&& echo "  ✓ /ping → pong" || { echo "  ✗ /ping נכשל"; fail=1; }
status_json="$(curl -s -m 5 "localhost:$PORT/status" 2>/dev/null || true)"
case "$status_json" in
	*'"alive"'*) echo "  ✓ /status → $status_json" ;;
	*) echo "  ✗ /status נכשל (${status_json:-אין תשובה})"; fail=1 ;;
esac

if [ "$fail" -ne 0 ]; then
	echo "--- לוגים אחרונים ---" >&2
	for s in $SERVICES; do echo "[$s]" >&2; tail -5 "$LOG_DIR/$s/current" >&2 2>/dev/null || true; done
	die "הפריסה לא עברה אימות"
fi

sv status $SERVICES

cat << DONEEOF

=== הסתיים בהצלחה ===
  קונפיג:   $CONFIG_DIR
  סטטוס:    export SVDIR=$SVDIR && sv status $SERVICES
  לוגים:    $LOG_DIR/{caddy,kiosk-restart}/current
  פרוקסי:   http://localhost:$PORT  (וגם מהרשת/WG על אותו פורט)
DONEEOF
