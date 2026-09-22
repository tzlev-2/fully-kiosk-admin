import { SvelteURL } from 'svelte/reactivity';
import {
	clampCfgToMax,
	parseVolumeCfg,
	serializeVolumeCfg,
	type VolumeCfg
} from './booster-config';
import { volumeFromAudioVolumes } from './audio-volumes';
import { FullyKioskClient } from './fully-kiosk-client';
import type { AppListItem, DeviceInfoResponse, RecentApp } from './fully-kiosk-types';
import type { SettingsWriter } from './settings-writer';
import type { ConnectionStatus } from './texts';

export const KIOSK_PROXY_PORT = import.meta.env.VITE_KIOSK_PROXY_PORT || 8765;

export interface DeviceRecord {
	key: string;
	deviceId?: string;
	formerKeys: string[];
	name: string;
	baseUrl: string;
	password: string;
	recentApps: RecentApp[];
	volume?: VolumeCfg;
}

type DeviceHooks = {
	persist: () => void;
	onInfo: (device: KioskDevice) => void;
};

export class KioskDevice {
	readonly key: string;
	deviceId: string | null;
	name = $state('');
	baseUrl: string;
	password: string;
	formerKeys: string[];
	deviceInfo = $state<DeviceInfoResponse | null>(null);
	connectionStatus = $state<ConnectionStatus>('idle');
	appList = $state<AppListItem[]>([]);
	recentApps = $state<RecentApp[]>([]);
	volumeCfg = $state<VolumeCfg>(parseVolumeCfg());
	isConnecting = $state(false);
	isLoading = $state(false);
	appsLoading = $state(false);

	private optimisticVolume = $state<number | null>(null);
	private prevVolume = 70;
	private hooks: DeviceHooks;

	constructor(record: DeviceRecord, hooks: DeviceHooks) {
		this.key = record.key;
		this.deviceId = record.deviceId ?? null;
		this.formerKeys = [...record.formerKeys];
		this.name = record.name;
		this.baseUrl = record.baseUrl;
		this.password = record.password;
		this.recentApps = [...record.recentApps];
		this.volumeCfg = record.volume ? { ...parseVolumeCfg(), ...record.volume } : parseVolumeCfg();
		this.hooks = hooks;
	}

	get volumeLevel(): number {
		return this.optimisticVolume ?? volumeFromAudioVolumes(this.deviceInfo?.audioVolumes) ?? 70;
	}

	get isMuted(): boolean {
		return this.volumeLevel === 0;
	}

	/** מקום יחיד שמשים deviceInfo שלם — מאפס optimisticVolume רק כשיש קריאת-אמת של זרם 3 להחליף אותו. */
	applyDeviceInfo(info: DeviceInfoResponse): void {
		this.deviceInfo = info;
		if (volumeFromAudioVolumes(info.audioVolumes) !== null) {
			this.optimisticVolume = null;
		}
	}

	toRecord(): DeviceRecord {
		return {
			key: this.key,
			deviceId: this.deviceId ?? undefined,
			formerKeys: [...this.formerKeys],
			name: this.name,
			baseUrl: this.baseUrl,
			password: this.password,
			recentApps: [...this.recentApps],
			volume: { ...this.volumeCfg }
		};
	}

	async loadVolumeCfg(writer: SettingsWriter): Promise<void> {
		try {
			const settings = await writer.read(this.toRecord());
			if ('boosterVolumeCfg' in settings) {
				this.volumeCfg = clampCfgToMax(parseVolumeCfg(settings.boosterVolumeCfg));
			} else {
				this.volumeCfg = parseVolumeCfg();
			}
			this.hooks.persist();
		} catch {
			/* cache stays */
		}
	}

	async saveVolumeCfg(writer: SettingsWriter, next: VolumeCfg): Promise<void> {
		const cfg = clampCfgToMax(next);
		const prevMaxLevel = this.volumeCfg.maxLevel;
		await writer.write(this.toRecord(), 'boosterVolumeCfg', serializeVolumeCfg(cfg));
		this.volumeCfg = cfg;
		this.hooks.persist();
		if (cfg.maxLevel !== prevMaxLevel) {
			await writer.write(this.toRecord(), 'volumeLimits', `3:${cfg.maxLevel}`);
		}
	}

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
			const res = await fetch(`${this.proxyBaseUrl}/restart`, {
				signal: AbortSignal.timeout(5000)
			});
			const data = await res.json();
			return data.ok === true;
		} catch {
			return false;
		}
	}

	private refreshInBackground() {
		this.getClient()
			.getDeviceInfo()
			.then((info) => {
				if (info?.deviceId || info?.deviceName) {
					this.applyDeviceInfo(info);
					this.hooks.onInfo(this);
				}
			})
			.catch(() => {
				/* optimisticVolume survives a failed background refresh — it's still the best known value */
			});
	}

	async connect(): Promise<boolean> {
		if (!this.baseUrl) return false;
		this.isConnecting = true;
		this.deviceInfo = null;

		try {
			this.connectionStatus = 'connecting';
			try {
				const info = await this.getClient().getDeviceInfo();
				if (info?.deviceId || info?.deviceName) {
					this.applyDeviceInfo(info);
					this.connectionStatus = 'connected';
					this.hooks.persist();
					return true;
				}
			} catch {
				/* continue to proxy flow */
			}

			this.connectionStatus = 'checking-proxy';
			const proxyAlive = await this.pingProxy();
			if (!proxyAlive) {
				this.connectionStatus = 'error-proxy';
				return false;
			}

			this.connectionStatus = 'checking-kiosk';
			const kioskAlive = await this.checkKioskStatus();
			if (kioskAlive) {
				this.connectionStatus = 'error-device';
				return false;
			}

			this.connectionStatus = 'restarting';
			const restarted = await this.triggerKioskRestart();
			if (!restarted) {
				this.connectionStatus = 'error-device';
				return false;
			}

			this.connectionStatus = 'waiting';
			const deadline = Date.now() + 30_000;
			while (Date.now() < deadline) {
				await new Promise((r) => setTimeout(r, 3000));
				try {
					const info = await this.getClient().getDeviceInfo();
					if (info?.deviceId || info?.deviceName) {
						this.applyDeviceInfo(info);
						this.connectionStatus = 'connected';
						this.hooks.persist();
						return true;
					}
				} catch {
					/* keep waiting */
				}
			}

			this.connectionStatus = 'error-device';
			return false;
		} finally {
			this.isConnecting = false;
		}
	}

	async refresh(): Promise<boolean> {
		this.isConnecting = true;
		try {
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) {
				this.applyDeviceInfo(info);
				return true;
			}
			return false;
		} catch {
			return false;
		} finally {
			this.isConnecting = false;
		}
	}

	disconnect(): void {
		this.deviceInfo = null;
	}

	async toggleKioskMode(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		const wasOn = this.deviceInfo.kioskMode;
		this.isLoading = true;
		let ok = false;
		try {
			if (wasOn) {
				await this.getClient().disableKioskMode();
			} else {
				await this.getClient().enableKioskMode();
			}
			this.deviceInfo.kioskMode = !wasOn;
			ok = true;
		} catch {
			ok = false;
		} finally {
			this.isLoading = false;
		}
		this.refreshInBackground();
		return ok;
	}

	async toggleKiosk(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		const wasLocked = this.deviceInfo.kioskLocked;
		this.isLoading = true;
		let ok = false;
		try {
			if (wasLocked) {
				await this.getClient().unlockKiosk();
			} else {
				await this.getClient().lockKiosk();
			}
			this.deviceInfo.kioskLocked = !wasLocked;
			ok = true;
		} catch {
			ok = false;
		} finally {
			this.isLoading = false;
		}
		this.refreshInBackground();
		return ok;
	}

	async toggleMaintenance(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		const wasOn = this.deviceInfo.maintenanceMode;
		this.isLoading = true;
		let ok = false;
		try {
			if (wasOn) {
				await this.getClient().disableLockedMode();
			} else {
				await this.getClient().enableLockedMode();
			}
			this.deviceInfo.maintenanceMode = !wasOn;
			ok = true;
		} catch {
			ok = false;
		} finally {
			this.isLoading = false;
		}
		this.refreshInBackground();
		return ok;
	}

	async setVolume(level: number): Promise<boolean> {
		if (!this.deviceInfo) return false;
		const clamped = Math.max(0, Math.min(100, level));
		this.optimisticVolume = clamped;
		try {
			const res = await this.getClient().setAudioVolume(clamped);
			if (res.status === 'NOK') {
				this.optimisticVolume = null;
				return false;
			}
			this.refreshInBackground();
			return true;
		} catch {
			this.optimisticVolume = null;
			return false;
		}
	}

	volumeUp(): void {
		void this.setVolume(this.isMuted ? this.prevVolume : this.volumeLevel + 10);
	}

	volumeDown(): void {
		void this.setVolume(this.volumeLevel - 10);
	}

	toggleMute(): void {
		if (this.isMuted) {
			void this.setVolume(this.prevVolume || 50);
		} else {
			this.prevVolume = this.volumeLevel;
			void this.setVolume(0);
		}
	}

	async restartApp(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		this.isLoading = true;
		try {
			await this.getClient().restartApp();
			return true;
		} catch {
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async rebootDevice(): Promise<boolean> {
		this.isLoading = true;
		try {
			await this.getClient().rebootDevice();
			return true;
		} catch {
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async takeScreenshot(): Promise<string | null> {
		try {
			const blob = await this.getClient().getScreenshot();
			return URL.createObjectURL(blob);
		} catch {
			return null;
		}
	}

	async navigateToUrl(url: string): Promise<boolean> {
		if (!this.deviceInfo) return false;
		this.isLoading = true;
		try {
			await this.getClient().loadUrl(url);
			return true;
		} catch {
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async screenOn(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		this.isLoading = true;
		let ok = false;
		try {
			await this.getClient().screenOn();
			this.deviceInfo.screenOn = true;
			ok = true;
		} catch {
			ok = false;
		} finally {
			this.isLoading = false;
		}
		return ok;
	}

	async screenOff(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		this.isLoading = true;
		let ok = false;
		try {
			await this.getClient().screenOff();
			this.deviceInfo.screenOn = false;
			ok = true;
		} catch {
			ok = false;
		} finally {
			this.isLoading = false;
		}
		return ok;
	}

	async lock(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		this.isLoading = true;
		let ok = false;
		try {
			await this.getClient().lockKiosk();
			this.deviceInfo.kioskLocked = true;
			ok = true;
		} catch {
			ok = false;
		} finally {
			this.isLoading = false;
		}
		return ok;
	}

	async unlock(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		this.isLoading = true;
		let ok = false;
		try {
			await this.getClient().unlockKiosk();
			this.deviceInfo.kioskLocked = false;
			ok = true;
		} catch {
			ok = false;
		} finally {
			this.isLoading = false;
		}
		return ok;
	}

	async toggleScreen(): Promise<boolean> {
		if (!this.deviceInfo) return false;
		this.isLoading = true;
		try {
			if (this.deviceInfo.screenOn) {
				await this.getClient().screenOff();
			} else {
				await this.getClient().screenOn();
			}
			const info = await this.getClient().getDeviceInfo();
			if (info?.deviceId || info?.deviceName) this.applyDeviceInfo(info);
			return true;
		} catch {
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async toForeground(): Promise<boolean> {
		this.isLoading = true;
		try {
			await this.getClient().toForeground();
			return true;
		} catch {
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async toBackground(): Promise<boolean> {
		this.isLoading = true;
		try {
			await this.getClient().toBackground();
			return true;
		} catch {
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async loadApps(): Promise<boolean> {
		this.appsLoading = true;
		try {
			const list = await this.getClient().getAppsList();
			this.appList = list.sort((a, b) => a.label.localeCompare(b.label));
			return true;
		} catch {
			return false;
		} finally {
			this.appsLoading = false;
		}
	}

	async launchApp(packageName: string): Promise<boolean> {
		if (!packageName.trim()) return false;
		this.isLoading = true;
		try {
			await this.getClient().startApplication(packageName.trim());
			const appInfo =
				this.appList.find((a) => a.package === packageName) ??
				this.recentApps.find((a) => a.package === packageName);
			if (appInfo) {
				const recent: RecentApp = {
					package: appInfo.package,
					label: appInfo.label,
					icon: appInfo.icon
				};
				this.recentApps = [
					recent,
					...this.recentApps.filter((a) => a.package !== packageName)
				].slice(0, 5);
				this.hooks.persist();
			}
			return true;
		} catch {
			return false;
		} finally {
			this.isLoading = false;
		}
	}

	async loadStartUrl(): Promise<boolean> {
		this.isLoading = true;
		try {
			await this.getClient().loadStartUrl();
			return true;
		} catch {
			return false;
		} finally {
			this.isLoading = false;
		}
	}
}
