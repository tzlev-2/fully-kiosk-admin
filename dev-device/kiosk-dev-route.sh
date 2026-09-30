#!/usr/bin/env bash
# מוסיף default route ל-netns של מכשיר-המעבדה, אחרי שאנדרואיד סיים אתחול.
# למה צריך: init של אנדרואיד מגדיר את eth0 בעצמו ומוחק את המסלול שנתאבק בזמן start,
# ומתוך אנדרואיד עצמו `ip route add` נדחה ב-"Operation not permitted".
# חסר-משמעות עד שיותר forward בחומת האש — ראו nftables-kiosk-dev.conf.
set -euo pipefail
GW="${GW:-10.90.90.1}"
CT="${CT:-kiosk-dev-android}"

for _ in $(seq 1 36); do
	[[ "$(podman exec "$CT" getprop sys.boot_completed 2>/dev/null | tr -d '\r')" == "1" ]] && break
	sleep 5
done
PID="$(podman inspect -f '{{.State.Pid}}' "$CT")"
[[ -n "$PID" && "$PID" != "0" ]] || { echo "אין קונטיינר פעיל"; exit 0; }
nsenter -t "$PID" -n ip route replace default via "$GW" dev eth0
nsenter -t "$PID" -n ip route
