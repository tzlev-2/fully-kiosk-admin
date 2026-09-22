import { SvelteURL } from 'svelte/reactivity';
import { DEFAULT_WEBSITES } from './config';
import { KioskDevice, type DeviceRecord } from './kiosk-device.svelte';
import type { SavedWebsite } from './types';

const KEY_DEVICES = 'fully-kiosk-devices';
const KEY_LAST = 'fully-kiosk-last-device';
const KEY_URL = 'fully-kiosk-url';
const KEY_PASS = 'fully-kiosk-password';
const KEY_WEBSITES = 'fully-kiosk-websites';
const KEY_RECENT_APPS = 'fully-kiosk-recent-apps';

export function extractDomain(url: string): string {
	try {
		return new SvelteURL(url).hostname;
	} catch {
		return url;
	}
}

function deviceNameFromUrl(baseUrl: string): string {
	try {
		return new SvelteURL(baseUrl).hostname;
	} catch {
		return baseUrl;
	}
}

export class KioskStore {
	devices = $state<KioskDevice[]>([]);
	websites = $state<SavedWebsite[]>([]);
	feedback = $state<{ type: 'success' | 'error'; message: string } | null>(null);
	lastDeviceKey = $state<string | null>(null);

	private feedbackTimer: ReturnType<typeof setTimeout> | null = null;

	private createDevice(record: DeviceRecord): KioskDevice {
		return new KioskDevice(record, {
			persist: () => this.persist(),
			onInfo: () => {}
		});
	}

	load(): void {
		const storedWebsites = localStorage.getItem(KEY_WEBSITES);
		this.websites = storedWebsites
			? (JSON.parse(storedWebsites) as SavedWebsite[])
			: DEFAULT_WEBSITES;

		const storedDevices = localStorage.getItem(KEY_DEVICES);
		if (storedDevices) {
			const records = JSON.parse(storedDevices) as DeviceRecord[];
			this.devices = records.map((r) => this.createDevice(r));
			this.lastDeviceKey = localStorage.getItem(KEY_LAST);
			return;
		}

		this.devices = [];

		const legacyUrl = localStorage.getItem(KEY_URL);
		if (!legacyUrl) return;

		const password = localStorage.getItem(KEY_PASS) ?? '';
		let recentApps: DeviceRecord['recentApps'] = [];
		const storedRecents = localStorage.getItem(KEY_RECENT_APPS);
		if (storedRecents) {
			try {
				recentApps = JSON.parse(storedRecents) as DeviceRecord['recentApps'];
			} catch {
				recentApps = [];
			}
		}

		const key = `local-${crypto.randomUUID()}`;
		const record: DeviceRecord = {
			key,
			formerKeys: [],
			name: deviceNameFromUrl(legacyUrl),
			baseUrl: legacyUrl,
			password,
			recentApps
		};

		this.devices = [this.createDevice(record)];
		this.lastDeviceKey = key;

		localStorage.setItem(KEY_DEVICES, JSON.stringify([record]));
		localStorage.setItem(KEY_LAST, key);
		localStorage.removeItem(KEY_URL);
		localStorage.removeItem(KEY_PASS);
		localStorage.removeItem(KEY_RECENT_APPS);
	}

	persist(): void {
		const records = this.devices.map((d) => d.toRecord());
		localStorage.setItem(KEY_DEVICES, JSON.stringify(records));
		if (this.lastDeviceKey) {
			localStorage.setItem(KEY_LAST, this.lastDeviceKey);
		}
		localStorage.setItem(KEY_WEBSITES, JSON.stringify(this.websites));
	}

	routeId(device: KioskDevice): string {
		return device.deviceId?.trim() ? device.deviceId : device.key;
	}

	byRouteId(id: string): KioskDevice | null {
		return (
			this.devices.find((d) => d.deviceId === id) ??
			this.devices.find((d) => d.key === id) ??
			this.devices.find((d) => d.formerKeys.includes(id)) ??
			null
		);
	}

	async connectDevice(device: KioskDevice): Promise<KioskDevice> {
		const ok = await device.connect();
		if (ok) {
			return this.applyIdentity(device);
		}
		return device;
	}

	async connectAll(): Promise<void> {
		await Promise.all(
			this.devices
				.filter((d) => d.connectionStatus !== 'connected' && !d.isConnecting)
				.map((d) => this.connectDevice(d))
		);
	}

	async refreshDevice(device: KioskDevice): Promise<boolean> {
		const ok = await device.refresh();
		if (ok) {
			this.applyIdentity(device);
		}
		return ok;
	}

	addDevice(input: { baseUrl: string; password: string; name?: string }): KioskDevice {
		const key = `local-${crypto.randomUUID()}`;
		const record: DeviceRecord = {
			key,
			formerKeys: [],
			name: input.name ?? deviceNameFromUrl(input.baseUrl),
			baseUrl: input.baseUrl,
			password: input.password,
			recentApps: []
		};
		const device = this.createDevice(record);
		this.devices = [...this.devices, device];
		this.persist();
		return device;
	}

	removeDevice(key: string): void {
		this.devices = this.devices.filter((d) => d.key !== key);
		if (this.lastDeviceKey === key) {
			this.lastDeviceKey = this.devices[0]?.key ?? null;
		}
		this.persist();
	}

	renameDevice(key: string, name: string): void {
		const device = this.devices.find((d) => d.key === key);
		if (!device) return;
		device.name = name;
		this.persist();
	}

	async bulk(
		run: (device: KioskDevice) => Promise<boolean>
	): Promise<{ ok: number; total: number }> {
		const total = this.devices.length;
		const results = await Promise.all(
			this.devices.map(async (device) => {
				try {
					return await run(device);
				} catch {
					return false;
				}
			})
		);
		const ok = results.filter(Boolean).length;
		return { ok, total };
	}

	rememberLast(key: string): void {
		this.lastDeviceKey = key;
		this.persist();
	}

	adoptFromQr(searchParams: URLSearchParams): KioskDevice | null {
		const auth = searchParams.get('auth');
		if (!auth) return null;
		try {
			const decoded = JSON.parse(atob(auth)) as { ip?: string; password?: string; port?: number };
			if (!decoded.ip || !decoded.password) return null;
			const baseUrl = `http://${decoded.ip}:${decoded.port ?? 2323}`;
			const existing = this.devices.find((d) => d.baseUrl === baseUrl);
			if (existing) {
				existing.password = decoded.password;
				this.persist();
				return existing;
			}
			return this.addDevice({ baseUrl, password: decoded.password });
		} catch {
			return null;
		}
	}

	showFeedback(type: 'success' | 'error', message: string): void {
		if (this.feedbackTimer) clearTimeout(this.feedbackTimer);
		this.feedback = { type, message };
		this.feedbackTimer = setTimeout(() => {
			this.feedback = null;
		}, 3000);
	}

	addWebsite(label: string, url: string, logoUrl?: string): void {
		this.websites = [...this.websites, { label, url, logoUrl: logoUrl || undefined }];
		this.persist();
	}

	removeWebsite(index: number): void {
		this.websites = this.websites.filter((_, i) => i !== index);
		this.persist();
	}

	applyIdentity(device: KioskDevice): KioskDevice {
		const id = device.deviceInfo?.deviceId?.trim();
		if (!id) return device;

		const existing = this.devices.find((d) => d !== device && d.deviceId === id);
		if (existing) {
			existing.baseUrl = device.baseUrl;
			existing.password = device.password;
			if (!existing.formerKeys.includes(device.key)) {
				existing.formerKeys.push(device.key);
			}
			if (device.deviceInfo) {
				existing.applyDeviceInfo(device.deviceInfo);
			}
			if (this.lastDeviceKey === device.key) {
				this.lastDeviceKey = existing.key;
			}
			this.devices = this.devices.filter((d) => d !== device);
			this.persist();
			return existing;
		}

		if (device.deviceId !== id) {
			device.deviceId = id;
			this.persist();
		}
		return device;
	}
}

export const kiosk = new KioskStore();
