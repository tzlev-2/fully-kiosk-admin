# Caddy CORS Proxy — Fully Kiosk

פרוקסי הפוך שמוסיף כותרות CORS לתקשורת עם Fully Kiosk Browser REST API.

## דרישות

- [Caddy](https://caddyserver.com/docs/install) מותקן ונגיש ב-PATH
- Fully Kiosk Browser פועל על המכשיר

---

## הפעלה מהירה

```bash
caddy run --config Caddyfile
```

ואז בממשק הניהול מזינים: `http://localhost:8765`

---

## משתני סביבה

| משתנה        | ברירת מחדל              | תיאור                 |
| ------------ | ----------------------- | --------------------- |
| `KIOSK_URL`  | `http://localhost:2323` | כתובת המכשיר / פרוקסי |
| `PROXY_PORT` | `8765`                  | פורט מאזין מקומי      |

**דוגמאות:**

```bash
# כתובת IP ישירה ברשת מקומית
KIOSK_URL=http://192.168.1.50:2323 caddy run --config Caddyfile

# דרך Cloudflare Tunnel
KIOSK_URL=https://kiosk-admin.example.com caddy run --config Caddyfile

# פורט מותאם
PROXY_PORT=9000 caddy run --config Caddyfile
```

---

## הגדרה כסרוויס ב-Termux

### 1. התקנה

```bash
pkg install caddy termux-services
```

### 2. העתקת קובץ התצורה

```bash
mkdir -p ~/.config/kiosk-proxy
cp /path/to/Caddyfile ~/.config/kiosk-proxy/Caddyfile
```

### 3. יצירת הסרוויס

הסרוויסים של termux-services נמצאים ב-`$PREFIX/var/service/`:

```bash
mkdir -p $PREFIX/var/service/caddy/log

cat > $PREFIX/var/service/caddy/run << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec caddy run --config /data/data/com.termux/files/home/.config/kiosk-proxy/Caddyfile 2>&1
EOF

cat > $PREFIX/var/service/caddy/log/run << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec svlogd -tt /data/data/com.termux/files/usr/var/log/caddy
EOF

chmod +x $PREFIX/var/service/caddy/run
chmod +x $PREFIX/var/service/caddy/log/run

# יצירת תיקיית הלוגים (נדרשת עבור svlogd)
mkdir -p $PREFIX/var/log/caddy
```

### 4. הפעלה

```bash
sv up caddy       # הפעל עכשיו
```

### 5. פקודות ניהול

```bash
sv status caddy   # בדוק סטטוס
sv down caddy     # עצור
sv restart caddy  # הפעל מחדש
```

---

## שרת Node — kiosk-restart-server

שרת קטן שמאפשר ל-Caddy להפעיל מחדש את Fully Kiosk בעת שגיאה, ולבדוק את סטטוסה.

```sh
nano ~/.config/kiosk-proxy/kiosk-restart-server.js
```

### Endpoints

| Path | תיאור |
| -------- | ----------------------------- |
| `GET /ping` | בדיקת חיות של הפרוקסי (מטופל ע"י Caddy ישירות) |
| `GET /status` | בדיקה אם Fully Kiosk מגיבה |
| `GET /restart` | הפעלה מחדש ידנית של Fully Kiosk |
| כל שגיאה 502/504 | הפעלה מחדש אוטומטית ע"י Caddy |

### הגדרה כסרוויס ב-Termux (kiosk-restart)

```bash
mkdir -p $PREFIX/var/service/kiosk-restart/log

cat > $PREFIX/var/service/kiosk-restart/run << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec node /data/data/com.termux/files/home/.config/kiosk-proxy/kiosk-restart-server.js 2>&1
EOF

cat > $PREFIX/var/service/kiosk-restart/log/run << 'EOF'
#!/data/data/com.termux/files/usr/bin/sh
exec svlogd -tt /data/data/com.termux/files/usr/var/log/kiosk-restart
EOF

chmod +x $PREFIX/var/service/kiosk-restart/run
chmod +x $PREFIX/var/service/kiosk-restart/log/run

mkdir -p $PREFIX/var/log/kiosk-restart
```

### הפעלה

```bash
sv up kiosk-restart
```

> אם הסרוויס לא עולה אוטומטי עם האתחול, הפעל גם: `sv-enable kiosk-restart`

### פקודות ניהול

```bash
sv status kiosk-restart   # בדוק סטטוס
sv down kiosk-restart     # עצור
sv restart kiosk-restart  # הפעל מחדש
```

### משתני סביבה (kiosk-restart)

הוסף לקובץ `$PREFIX/var/service/kiosk-restart/run` לפני ה-`exec`:

```sh
export KIOSK_URL=http://localhost:2323
export RESTART_PORT=9000
```

---

## הפעלה עם Termux:Boot (בהדלקת המכשיר)

1. התקן את אפליקציית **Termux:Boot** מ-F-Droid
2. פתח את Termux:Boot פעם אחת כדי לרשום אותה
3. בהגדרות Android — אפשר ל-Termux **הפעלה ברקע** ו**הפעלה עם האתחול**
4. הסרוויסים של `termux-services` יעלו אוטומטית עם הפעלת המכשיר

> **שים לב:** ב-Android 12+ יתכן שיש להגדיר גם חריג מ-Battery Optimization עבור Termux.

---

פתיחה מרחוק של פולי

```sh
am start -n com.fullykiosk.emm/de.ozerov.fully.MainActivity
```

```sh
settings put global adb_wifi_enabled 1
settings put global adb_wifi_port 5588

settings put global adb_enabled 1

settings get global adb_enabled
settings get global adb_wifi_enabled
settings get global adb_wifi_port
```

```js
"https://dev.daily-schedule.pages.dev/kiosk?auth=" +
  btoa(
    JSON.stringify({
      ip: "192.168.68.58",
      port: 8765,
      password: "1234",
    }),
  );
// https://dev.daily-schedule.pages.dev/kiosk?auth=eyJpcCI6IjE5Mi4xNjguNjguNTgiLCJwb3J0Ijo4NzY1LCJwYXNzd29yZCI6IjEyMzQifQ==
```

```js
"https://dev.daily-schedule.pages.dev/kiosk?auth=" +
  btoa(
    JSON.stringify({
      ip: "192.168.33.98",
      port: 8765,
      password: "***REDACTED-ROTATE-ME***",
    }),
  );
```

```sh
getprop persist.adb.tls_server.enable
getprop service.adb.tls.port
getprop service.adb.tcp.port

ps -A | grep adbd
```

```sh
setprop persist.adb.tls_server.enable 1
setprop service.adb.tls.port 5555
setprop service.adb.tcp.port 5555
```

content://com.llamalab.automate.provider/flows/8/statements/1

### Shizuku

```sh
adb shell /data/app/~~azd7SKPJ5Yy1YTTkeHk2VQ==/moe.shizuku.privileged.api-MpIAVywetQjjVOP2oGD-CQ==/lib/arm64/libshizuku.so

ss -ltn

am start -n moe.shizuku.privileged.api/moe.shizuku.manager.MainActivity
```

```sh
cloudflared access tcp --hostname adb-5588.tzlev.ovh --url localhost:5588
```

```powershell
scrcpy.exe `
  --video-bit-rate 512K `
  --max-fps 10 `
  --video-codec h264 `
  --audio-codec opus `
  --audio-bit-rate 16K `
  --display-buffer 0 `
  --max-size 800

scrcpy.exe `
  --video-source camera `
  --video-bit-rate 128K `
  --max-fps 1 `
  --video-codec h264 `
  --audio-codec opus `
  --audio-bit-rate 16K `
  --display-buffer 0 `
  --max-size 500 `
  --camera-id=0 
````
