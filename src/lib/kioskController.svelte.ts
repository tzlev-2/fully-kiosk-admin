import { SvelteURL } from "svelte/reactivity";
import { FullyKioskClient } from './fullyKioskClient';
import type { AppListItem, DeviceInfoResponse, RecentApp } from './fullyKioskTypes';
import { KIOSK_TEXTS, type ConnectionStatus } from './texts';

export const KIOSK_PROXY_PORT = import.meta.env.VITE_KIOSK_PROXY_PORT || 8765; // פורט ברירת המחדל של Fully Kiosk Remote Admin
// localStorage keys
const KEY_URL = 'fully-kiosk-url';
const KEY_PASS = 'fully-kiosk-password';
const KEY_WEBSITES = 'fully-kiosk-websites';
const KEY_RECENT_APPS = 'fully-kiosk-recent-apps';

const DEFAULT_WEBSITES: SavedWebsite[] = [
	{ label: 'מערכת משימות', url: 'https://daily-schedule.pages.dev/', logoUrl: 'https://daily-schedule.pages.dev/icons/icon.svg' },
	{ label: "ג'ינג'ים — משחקים לימודיים", url: 'https://gingim.net/games/' },
	{ label: 'פאזל', url: 'https://puzzle.aybritman.workers.dev/' },
];

export interface SavedWebsite {
	label: string;
	url: string;
	logoUrl?: string;
}

export function extractDomain(url: string): string {
	try {
		return new SvelteURL(url).hostname;
	} catch {
		return url;
	}
}

/**
 * Controller עבור מסך ניהול קיוסק פולי.
 * משתמש ב-class כדי לאפשר ייצוא תקין של $state בSvelte 5.
 */
class KioskController {
	baseUrl = $state('');
	password = $state('');
	deviceInfo = $state<DeviceInfoResponse | null>(null);
	websites = $state<SavedWebsite[]>([]);
	isConnecting = $state(false);
	connectionStatus = $state<ConnectionStatus>('idle');
	isLoading = $state(false);
	appsLoading = $state(false);
	appList = $state<AppListItem[]>([]);
	recentApps = $state<RecentApp[]>([]);
	feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	// state ווליום מקומי (אין API לקריאה)
	volumeLevel = $state(70);
	isMuted = $state(false);
	private prevVolume = 70;

	private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

	// --- כלי עזר ---

	private getClient(): FullyKioskClient {
		return new FullyKioskClient(this.baseUrl, this.password);
	}

	private get proxyBaseUrl(): string {
		try {
			const url = new SvelteURL(this.baseUrl);
			url.port = String(KIOSK_PROXY_PORT);
			return url.origin;
		} catch {
			return '';
		}
	}

	private async pingProxy(): Promise<boolean> {
		try {
			const res = await fetch(`${this.proxyBaseUrl}/ping`, { signal: AbortSignal.timeout(3000) });
			return res.ok;
		} catch {
			return false;
		}
	}

	private async checkKioskStatus(): Promise<boolean> {
		try {
			const res = await fetch(`${this.proxyBaseUrl}/status`, { signal: AbortSignal.timeout(3000) });
			const data = await res.json();
			return data.alive === true;
		} catch {
			return false;
		}
	}

	private async triggerKioskRestart(): Promise<boolean> {
		try {
			const res = await fetch(`${this.proxyBaseUrl}/restart`, { signal: AbortSignal.timeout(5000) });
			const data = await res.json();
			return data.ok === true;
		} catch {
			return false;
		}
	}

	private showFeedback(type: 'success' | 'error', message: string) {
		if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
		this.feedback = { type, message };
		this.feedbackTimer = setTimeout(() => {
			this.feedback = null;
		}, 3000);
	}

	// --- אחסון ---

	loadFromStorage() {
		this.baseUrl = localStorage.getItem(KEY_URL) ?? '';
		this.password = localStorage.getItem(KEY_PASS) ?? '';
		const stored = localStorage.getItem(KEY_WEBSITES);
		this.websites = stored ? (JSON.parse(stored) as SavedWebsite[]) : DEFAULT_WEBSITES;
		const storedRecents = localStorage.getItem(KEY_RECENT_APPS);
		this.recentApps = storedRecents ? (JSON.parse(storedRecents) as RecentApp[]) : [];
	}

	private saveConnectionToStorage() {
		localStorage.setItem(KEY_URL, this.baseUrl);
		localStorage.setItem(KEY_PASS, this.password);
	}

	private saveWebsitesToStorage() {
		localStorage.setItem(KEY_WEBSITES, JSON.stringify(this.websites));
	}

	// --- פעולות ---

	async connect() {
		if (!this.baseUrl) return;
		this.isConnecting = true;
		this.deviceInfo = null;

		try {
			// שלב 1 — ניסיון חיבור ישיר
			this.connectionStatus = 'connecting';
			try {
				const info = await this.getClient().getDeviceInfo();
				if (info?.deviceId || info?.deviceName) {
					this.deviceInfo = info;
					this.saveConnectionToStorage();
					this.connectionStatus = 'connected';
					return;
				}
			} catch { /* ממשיך לשלב 2 */ }

			// שלב 2 — בדוק אם הפרוקסי עונה
			this.connectionStatus = 'checking-proxy';
			const proxyAlive = await this.pingProxy();
			if (!proxyAlive) {
				this.connectionStatus = 'error-proxy';
				return;
			}

			// שלב 3 — בדוק אם פולי רצה
			this.connectionStatus = 'checking-kiosk';
			const kioskAlive = await this.checkKioskStatus();
			if (kioskAlive) {
				// פולי רצה אבל לא מגיבה — מצב לא ברור
				this.connectionStatus = 'error-device';
				return;
			}

			// שלב 4 — הפעל מחדש
			this.connectionStatus = 'restarting';
			const restarted = await this.triggerKioskRestart();
			if (!restarted) {
				this.connectionStatus = 'error-device';
				return;
			}

			// שלב 5 — המתן לאתחול (עד 30 שניות)
			this.connectionStatus = 'waiting';
			const deadline = Date.now() + 30_000;
			while (Date.now() < deadline) {
				await new Promise((r) => setTimeout(r, 3000));
				try {
					const info = await this.getClient().getDeviceInfo();
					if (info?.deviceId || info?.deviceName) {
						this.deviceInfo = info;
						this.saveConnectionToStorage();
						this.connectionStatus = 'connected';
						return;
					}
				} catch { /* ממשיך לנסות */ }
			}

			this.connectionStatus = 'error-device';
		} finally {
			this.isConnecting = false;
		}
	}

	async toggleKioskMode() {
		if (!this.deviceInfo) return;
		if (this.deviceInfo.kioskMode) {
			if (!window.confirm(KIOSK_TEXTS.CONFIRM_DISABLE_KIOSK)) return;
		}
		this.isLoading = true;
		try {
			if (this.deviceInfo.kioskMode) {
				await this.getClient().disableKioskMode();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_KIOSK_MODE_OFF);
			} else {
				await this.getClient().enableKioskMode();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_KIOSK_MODE_ON);
			}
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async toggleKiosk() {
		if (!this.deviceInfo) return;
		this.isLoading = true;
		try {
			if (this.deviceInfo.kioskLocked) {
				await this.getClient().unlockKiosk();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_UNLOCKED);
			} else {
				await this.getClient().lockKiosk();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_LOCKED);
			}
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async toggleMaintenance() {
		if (!this.deviceInfo) return;
		this.isLoading = true;
		try {
			if (this.deviceInfo.maintenanceMode) {
				await this.getClient().disableLockedMode();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_MAINTENANCE_OFF);
			} else {
				await this.getClient().enableLockedMode();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_MAINTENANCE_ON);
			}
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async setVolume(level: number) {
		const clamped = Math.max(0, Math.min(100, level));
		this.volumeLevel = clamped;
		this.isMuted = clamped === 0;
		try {
			await this.getClient().setAudioVolume(clamped);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		}
	}

	volumeUp() { this.setVolume(this.isMuted ? this.prevVolume : this.volumeLevel + 10); }
	volumeDown() { this.setVolume(this.volumeLevel - 10); }

	toggleMute() {
		if (this.isMuted) {
			this.setVolume(this.prevVolume || 50);
		} else {
			this.prevVolume = this.volumeLevel;
			this.setVolume(0);
		}
	}

	async restartApp() {
		if (!window.confirm(KIOSK_TEXTS.CONFIRM_RESTART_APP)) return;
		this.isLoading = true;
		try {
			await this.getClient().restartApp();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_RESTART_APP);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async rebootDevice() {
		if (!window.confirm(KIOSK_TEXTS.CONFIRM_REBOOT_DEVICE)) return;
		this.isLoading = true;
		try {
			await this.getClient().rebootDevice();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_REBOOT_DEVICE);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async takeScreenshot(): Promise<string | null> {
		try {
			const blob = await this.getClient().getScreenshot();
			return URL.createObjectURL(blob);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
			return null;
		}
	}

	async navigateToUrl(url: string) {
		this.isLoading = true;
		try {
			await this.getClient().loadUrl(url);
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_NAVIGATED);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async toggleScreen() {
		if (!this.deviceInfo) return;
		this.isLoading = true;
		try {
			if (this.deviceInfo.screenOn) {
				await this.getClient().screenOff();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_SCREEN_OFF);
			} else {
				await this.getClient().screenOn();
				this.showFeedback('success', KIOSK_TEXTS.SUCCESS_SCREEN_ON);
			}
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async toForeground() {
		this.isLoading = true;
		try {
			await this.getClient().toForeground();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_FOREGROUND);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async toBackground() {
		this.isLoading = true;
		try {
			await this.getClient().toBackground();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_BACKGROUND);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async loadApps() {
		this.appsLoading = true;
		try {
			const list = await this.getClient().getAppsList();
			this.appList = list.sort((a, b) => a.label.localeCompare(b.label));
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.appsLoading = false;
		}
	}

	async launchApp(packageName: string) {
		if (!packageName.trim()) return;
		this.isLoading = true;
		try {
			await this.getClient().startApplication(packageName.trim());
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_APP_LAUNCHED);
			// שמירת האפליקציה ברשימת האחרונות
			const appInfo =
				this.appList.find(a => a.package === packageName) ??
				this.recentApps.find(a => a.package === packageName);
			if (appInfo) {
				const recent: RecentApp = { package: appInfo.package, label: appInfo.label, icon: appInfo.icon };
				this.recentApps = [recent, ...this.recentApps.filter(a => a.package !== packageName)].slice(0, 5);
				localStorage.setItem(KEY_RECENT_APPS, JSON.stringify(this.recentApps));
			}
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	async loadStartUrl() {
		this.isLoading = true;
		try {
			await this.getClient().loadStartUrl();
			this.showFeedback('success', KIOSK_TEXTS.SUCCESS_START_URL);
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		} finally {
			this.isLoading = false;
		}
	}

	addWebsite(label: string, url: string, logoUrl?: string) {
		this.websites = [...this.websites, { label, url, logoUrl: logoUrl || undefined }];
		this.saveWebsitesToStorage();
	}

	removeWebsite(index: number) {
		this.websites = this.websites.filter((_, i) => i !== index);
		this.saveWebsitesToStorage();
	}

	// קורא פרמטר ?auth=<base64> מה-URL ומאכלס baseUrl ו-password
	loadFromUrlParam(searchParams: URLSearchParams): boolean {
		const auth = searchParams.get('auth');
		if (!auth) return false;
		try {
			const decoded = JSON.parse(atob(auth));
			if (!decoded.ip || !decoded.password) return false;
			this.baseUrl = `http://${decoded.ip}:${decoded.port ?? 2323}`;
			this.password = decoded.password;
			return true;
		} catch {
			return false;
		}
	}

	disconnect() {
		this.deviceInfo = null;
	}

	async refresh() {
		this.isConnecting = true;
		try {
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.deviceInfo = info;
		} catch {
			this.showFeedback('error', KIOSK_TEXTS.ERROR_CONNECTION);
		} finally {
			this.isConnecting = false;
		}
	}
}

export const ctrl = new KioskController();
