# מכשיר-מעבדה לניסויי Fully Kiosk

מכשיר אנדרואיד **בקונטיינר** על netcup, עם Fully Kiosk מותקן ו-REST API פתוח, כדי
לנסות שינויים בממשק הניהול בלי לגעת בטאבלטים שבכיתות.

**מצב נוכחי (22.9.2026):** רץ. אנדרואיד 15 x86_64 (`redroid15_x86_64`), מסך
1280x800, ‏Fully Kiosk Browser 1.61.3, ‏REST API מאומת. אחרי
`systemctl restart kiosk-dev-android` — אנדרואיד עולה ב-20 שניות וה-REST חוזר לבד
תוך 5 נוספות. ‏baseline שמור: `/var/lib/kiosk-dev-android/snapshots/baseline-fully-1.61.3.tgz`.

---

## למה ReDroid ולא אמולטור

למכונה **אין וירטואליזציה מקוננת**: ב-`/proc/cpuinfo` יש `hypervisor` בלבד, בלי
`vmx`/`svm`, ו-`/dev/kvm` לא קיים. אמולטור (AVD / Cuttlefish) ירוץ רק באמולציית
תוכנה — בלתי-שמיש. ReDroid מריץ userspace של אנדרואיד על ליבת הלינוקס של המאחסן.

## Fully Kiosk על x86_64 — נבדק, לא הונח

‏`Fully-Kiosk-Browser-v1.61.3.apk` הוא APK אוניברסלי: `arm64-v8a`, `armeabi-v7a`,
`x86`, `x86_64` — ו-`lib/x86_64/libmycpp.so` הוא `ELF 64-bit x86-64` אמיתי.

- ‏`libtoolChecker.so` הוא **RootBeer** (זיהוי root). חיפוש `qemu`/`goldfish`/
  `ranchu`/`emulator` בספריות לא מצא כלום — האפליקציה לא חוסמת את עצמה בקונטיינר.
- שם החבילה כאן: `de.ozerov.fully` (הגרסה מהאתר). הטאבלטים בשטח מריצים
  `com.fullykiosk.emm` — אותו קוד, applicationId אחר, REST זהה.
- ‏`de.ozerov.fully.DeviceOwnerReceiver` — חולץ מהמניפסט; שמות מפתחות ההגדרה
  (`remoteAdminPassword`, `launchOnBoot`) חולצו מה-dex.

## איזו גרסת אנדרואיד — ולמה 15

המעבדה רצה **לפני** הטאבלטים: המטרה לראות מה יישבר בגרסאות חדשות. אנדרואיד 15 יצא
בספטמבר 2024 והאימג' נדחף ב-29.6.2025 — גרסה משוחררת עם ~9 חודשי QPR. ‏`16.0.0`
נדחף באותו יום בדיוק, מיד עם שחרור AOSP 16 — בלי בשלות. לכן 15.

---

## הקמה

```bash
sudo dev-device/setup.sh        # על המכונה המאחסנת: מודולים + binder + יחידות quadlet
dev-device/provision.sh         # מקונטיינר הסוכנים (יש בו adb) — או מהמכונה, אם הותקן adb
```

‏`provision.sh` הוא **אוטומטי לחלוטין ואידמפוטנטי**: מוריד APK ומאמת sha256, ממתין
ל-`sys.boot_completed`, מתקין עם `-g`, מדליק Remote Admin, מוודא שה-REST עלה, קובע
שרידות-אתחול, ומחיל את `scripts/configure-fully-device.mjs`.

הסיסמה נשמרת ב-`/etc/kiosk-dev/remote-admin-password` (0640, root:root). מקונטיינר
הסוכנים הקובץ אינו נגיש — להעביר `FULLY_PASSWORD=…`, או להתקין `adb` על המכונה
ולהריץ שם עם sudo.

### למה root — נמדד, לא הונח

**הסיבה האמיתית אינה rootless מול root, אלא מודולי ליבה חסרים.** אנדרואיד 15 מרכיב
כל חבילת APEX (‏72 במקרה שלנו) דרך **loop device**, ובלי מודול `loop` נופל כך:

```
apexd-bootstrap: Could not create loop device …: Failed to open loop-control: No such device
init: Service apexd-bootstrap has 'reboot_on_failure' option and failed, shutting down system
```

התוצאה היא `exit 129` בתוך שנייה, ובלי לוג — ל-init אין `/dev/kmsg` לכתוב אליו,
ולכן `podman logs` ריק. **הלוג היחיד שמגלה משהו הוא `sudo dmesg -T`.**

אחרי `modprobe loop` (ו-`dm_mod`), פודמן של root עולה מלא. **פודמן ללא-שורש נבדק
שוב עם המודולים הטעונים — ועדיין מת.** ההסבר: חיבור loop devices מצריך
`CAP_SYS_ADMIN` אמיתי, ו-`/dev/loop-control` הוא `root:disk`; לקונטיינר ללא-שורש אין
אף אחד מהשניים. התיעוד של ReDroid מדגים `docker run --privileged` בלבד ומתיישב עם זה.

### דרישות הליבה — מה יש ומה אין על המכונה

| דרישה | מצב |
|---|---|
| `binder_linux` | ✅ מודול in-tree (`CONFIG_ANDROID_BINDER_IPC=m` ב-`debian/config/amd64/config`) |
| `binderfs` | ❌ **לא נתמכת** (`grep -w binder /proc/filesystems` ריק) — לכן `devices=` בטעינת המודול, ומופע נוסף דורש אתחול |
| `ashmem` | ❌ הוסר מהקרנל ב-**5.18** (`drivers/staging/android/ashmem.c` קיים ב-`v5.17`, התיקייה לא קיימת ב-`v5.18`/`v6.12`) → `androidboot.use_memfd=true` |
| `loop` | ⚠️ לא נטען כברירת מחדל — **החוסם שהפיל הכול**; `setup.sh` טוען ומקבע |
| `dm_mod` | ⚠️ לא נטען כברירת מחדל; נדרש במסלול ה-APEX |
| `DMA-BUF Heaps` | ✅ `/dev/dma_heap/system` קיים |

---

## מלכודות שכבר נפלנו בהן

| מלכודת | מה קורה |
|---|---|
| `redroid.width=…` | **מתעלם בשקט.** הקידומת `androidboot.` היא חלק מהשם: `androidboot.redroid_width`. בלעדיה המסך נשאר 720x1280 |
| udev `KERNEL=="binder*"` | לא תופס `hwbinder`/`vndbinder` — הם נשארים 0600. צריך `*binder*` |
| פורט 8765 | תפוס על המכונה ע"י שירות אחר. ה-Caddyfile של `termux-proxy-server/` יורש אותו מהטאבלט; כאן הפרוקסי על **12323** |
| `dpm set-device-owner` | Fully נכנס למסך **Device Provisioning**. הקוד `FFF` מדלג עליו — אבל **דורש רשת** (`Getting provisioning profile failed due to some network issue`), ו-`SKIP` אינו יוצא ממנו. ‏`dpm remove-active-admin` נכשל («non-test admin») — היציאה היחידה היא מחיקת `/data`. לכן `--device-owner` ולא ברירת מחדל |
| הסדר: device owner **אחרי** Remote Admin | Fully רושם `.MyDeviceAdmin` כשמדליקים Remote Admin, ומאז `set-device-owner` נכשל ב-«Unknown admin: …DeviceOwnerReceiver». ‏`dpm` חייב לקדום להדלקה |
| `am force-stop de.ozerov.fully` | «Ignoring request to force stop protected package» כשהוא device owner |
| ‏`launchOnBoot` כבוי | כל `restart` של הקונטיינר משאיר את ה-REST מת עד הפעלה ידנית של האפליקציה |

---

## לראות ולשלוט — scrcpy בתוך gui-portal

‏`gui-portal` הוא דביאן 13 עם `Xvfb` על `DISPLAY=:1` שמוזרם ב-selkies ל-
`desktop.tzlev.ovh`, והוא `network=host` — ולכן `127.0.0.1:5555` פתוח מתוכו ואין
צורך בגישור רשת. הותקנו שם `adb` 1.0.41 ו-`scrcpy` 3.3.4:

```bash
podman exec gui-portal sh -c 'export DISPLAY=:1; adb connect 127.0.0.1:5555'
podman exec -d gui-portal sh -c 'export DISPLAY=:1; exec scrcpy -s 127.0.0.1:5555 \
  --no-audio --window-title kiosk-dev-android --window-x 60 --window-y 60 > /tmp/scrcpy.log 2>&1'
```

🛑 **ההתקנה הזאת נדיפה** — היא בתוך קונטיינר רץ, ותיעלם אם `gui-portal` ייבנה או
ייווצר מחדש. לקיבוע צריך להוסיף `adb scrcpy` לבנייה של `localhost/tzlev-gui`.

| רוצה | איך |
|---|---|
| לראות ולשלוט כאדם | scrcpy בשולחן העבודה של הפורטל (למעלה) |
| צילום מסך לסוכן | `adb -s 127.0.0.1:5555 exec-out screencap -p > s.png` |
| לוגים | `adb logcat -d` · `sudo dmesg -T` (init של אנדרואיד כותב לשם, לא ל-`podman logs`) |
| shell | `adb -s 127.0.0.1:5555 shell` (‏`adb root` עובד — userdebug) |

## לעבוד מול הממשק

| רוצה | איך |
|---|---|
| ה-SPA מול המכשיר | `bun dev`, ובממשק להזין `http://localhost:12323` — אין mixed-content כי הדף והפרוקסי שניהם http |
| מ-`kiosk-admin.tzlev.ovh` (https) | hostname ב-cloudflared מאחורי Access אל `127.0.0.1:12323` |
| לאפס אחרי ניסוי הרסני | `sudo dev-device/snapshot.sh restore /var/lib/kiosk-dev-android/snapshots/baseline-fully-1.61.3.tgz` |
| להחליף גרסת אנדרואיד | `Image=` ביחידה — `redroid/redroid` לאנדרואיד 11–16 (8/9/10 לא יעלו: ashmem) |

### רשת

המכשיר על רשת podman מבודדת `kiosk-dev` (`10.90.90.0/24`, ‏`quadlet/kiosk-dev.network`),
ויש לו יציאה לאינטרנט — אומת בטעינת אתר אמיתי ב-WebView.

שני דברים נדרשו לכך, ושניהם **תלויי-מכונה ומתועדים בריפו הפרטי**
(`tzlev-docs-repo` → `knowledge/workflows/runbooks/runbook-kiosk-dev-android-container.md`),
לא כאן: היתר ברמת המאחסן, ו-`default route` ב-netns. את השני מספק
`kiosk-dev-route.service` — אנדרואיד מגדיר `eth0` בעצמו ומוחק את המסלול, ומתוכו
`ip route add` נדחה ב-«Operation not permitted», ולכן השירות ממתין ל-
`sys.boot_completed` ומוסיף מבחוץ ב-`nsenter`. ‏`ExecStartPost` ביחידה לא עובד —
הוא רץ לפני שאנדרואיד מגדיר את הממשק.

### פורטים

| תפקיד | פורט |
|---|---|
| adb | `127.0.0.1:5555` |
| ‏REST של Fully | `127.0.0.1:2323` |
| פרוקסי CORS (מה שמזינים בממשק) | `127.0.0.1:12323` |
| מכשיר שני בעתיד | `5556` · `2324` · `12324` |

---

## אוטומציית ההתקנה המלאה — הסשן המקביל

‏⟨22.9.2026⟩ סשן על `srv1812097` בנה פריסת טאבלט קיוסק **מ-ADB בלבד** (בלי factory
reset ובלי הגדרה ידנית), אומתה על TAB KINGKONG אנדרואיד 13, עם מהדורת ה-EMM
(`com.fullykiosk.emm`) וקובץ הגדרות שמוגש מ-`kiosk-admin.tzlev.ovh/provision/…` מול
טוקן. ‏`provision.sh --device-owner` כאן מיישר לרצף שלהם.

מה שנבדק כאן מול המכשיר בקונטיינר:

| טענה | מה נמצא במעבדה |
|---|---|
| `dpm set-device-owner` דורש אפס חשבונות, לא factory reset | ✅ עבר עם `dumpsys account` = 0 |
| `FULLY_PROVISIONING_CODE=FFF` מדלג על מסך הקוד | ⚠️ **דורש רשת** — `Getting provisioning profile for FFF` ואז `failed due to some network issue`. במעבדה זה חוסם עד שתיפתח יציאה לאינטרנט |
| appops לפני ProvisioningActivity ⇒ אפס מסכי הרשאות | ✅ הוחל בלי דיאלוגים |
| להעביר את ה-extras ל-activity שכבר רצה | ❌ `onNewIntent … Got unexpected intent null`; גם `am start -S` לא עוזר (חבילה מוגנת). צריך להשיק אותה מחדש נקי |

**הרנבוקים שלהם** (`knowledge/workflows/runbooks/provision-kiosk-tablet-via-adb.md`,
`fully-kiosk-api-reference.md`, `knowledge/wiki/services/fully-kiosk/fully-kiosk.md`)
הם מקור האמת למתכון ולממשקים — לא לשכפל אותם לכאן. ⚠️ ב-22.9 הם עוד לא נראו
ב-`tzlev-docs-repo` מ-netcup (גם לא ב-`origin/main`) — כנראה טרם נדחפו.

## מה **לא** נאמן כאן

ניסוי שעובר במעבדה אינו ראיה להתנהגות בכיתה:

- **אין Play Services**, אין מסך-מגע וחיישנים אמיתיים.
- **SELinux כבוי** בקונטיינר (`getenforce` → `Disabled`), וכל קובץ מדווח על אותה
  מחרוזת `HACKED` כ-context — זה stub של libselinux באימג', לא מאפיין של הקובץ.
- **גרסה חופשית, לא PLUS** — Fully מציג «Please Get a License» מעל התוכן. מה
  שמסומן PLUS בתיעוד שלהם לא ייבדק כאן.
- **המעבדה על אנדרואיד 15** בזמן שהטאבלטים בכיתות עשויים להיות על גרסה ישנה יותר.
- התנהגות Device Admin — כיבוי מסך, `EXPAND_STATUS_BAR`, `lockKiosk`, single-app
  mode — עלולה להיות שונה, ובמעבדה היא ממילא חסומה מאחורי קיר ה-Provisioning.

**מה כן:** ה-REST API, צינור ה-UI, `injectJsCode`, רגרסיות וסקריפטים — כלומר כל מה
שהממשק הזה עושה בפועל. אימות סופי לפני פריסה לכיתות — על טאבלט אמיתי.

💡 `--privileged` נותן לקונטיינר גישה רחבה ל-`/dev` של מכונה שמריצה את שירותי
הפורטל. שווה לנסות בהמשך להסיר אותו ולהשאיר רק את מכשירי binder + loop-control.
