#!/usr/bin/env bash
# שמירה/שחזור של מצב מכשיר-המעבדה. מריצים עם sudo על המכונה המאחסנת.
#   snapshot.sh save [שם]     — עוצר, ארכב את /data, מפעיל מחדש
#   snapshot.sh restore <קובץ> — עוצר, מוחק את /data, פורש את הארכיון, מפעיל מחדש
#   snapshot.sh list
set -euo pipefail

DATA_ROOT=/var/lib/kiosk-dev-android
SNAP_DIR="$DATA_ROOT/snapshots"
UNIT=kiosk-dev-android.service

[[ $EUID -eq 0 ]] || { echo "צריך sudo"; exit 1; }
install -d -m 0755 "$SNAP_DIR"

case "${1:-}" in
save)
	name="${2:-baseline-$(date +%F-%H%M)}"
	out="$SNAP_DIR/$name.tgz"
	[[ -e "$out" ]] && { echo "כבר קיים: $out"; exit 1; }
	systemctl stop "$UNIT"
	tar -C "$DATA_ROOT" -czf "$out" data
	systemctl start "$UNIT"
	ls -lh "$out"
	;;
restore)
	src="${2:?נתיב ארכיון}"
	[[ -f "$src" ]] || { echo "לא נמצא: $src"; exit 1; }
	# הגנה: מוחקים רק את נתוני מכשיר-המעבדה, בנתיב קבוע
	[[ "$DATA_ROOT/data" == /var/lib/kiosk-dev-android/data ]] || exit 1
	read -r -p "למחוק את $DATA_ROOT/data ולשחזר מ-$src? [yes/no] " ans
	[[ "$ans" == yes ]] || { echo "בוטל"; exit 1; }
	systemctl stop "$UNIT"
	rm -rf "$DATA_ROOT/data"
	tar -C "$DATA_ROOT" -xzf "$src"
	systemctl start "$UNIT"
	echo "שוחזר. המכשיר עולה מחדש (~דקה)."
	;;
list)
	ls -lh "$SNAP_DIR" 2>/dev/null || echo "אין תצלומים"
	;;
*)
	sed -n '2,6p' "${BASH_SOURCE[0]}"
	exit 1
	;;
esac
