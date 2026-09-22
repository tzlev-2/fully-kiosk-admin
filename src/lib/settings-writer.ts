import { FullyKioskClient } from './fully-kiosk-client';
import { KIOSK_PROXY_PORT, type DeviceRecord } from './kiosk-device.svelte';

export interface SettingsWriter {
	write(device: DeviceRecord, key: string, value: string): Promise<void>;
	read(device: DeviceRecord): Promise<Record<string, string>>;
}

function proxyOrigin(baseUrl: string): string {
	const url = new URL(baseUrl);
	url.port = String(KIOSK_PROXY_PORT);
	return url.origin;
}

export function settingsFromListBody(body: unknown): Record<string, string> {
	if (!body || typeof body !== 'object') return {};

	const obj = body as Record<string, unknown>;
	const source =
		obj.settings && typeof obj.settings === 'object' && !Array.isArray(obj.settings)
			? (obj.settings as Record<string, unknown>)
			: obj;

	const out: Record<string, string> = {};
	for (const [key, value] of Object.entries(source)) {
		if (key === 'status' || key === 'statustext') continue;
		if (typeof value === 'string') {
			out[key] = value;
		} else if (typeof value === 'number' || typeof value === 'boolean') {
			out[key] = String(value);
		} else if (value && typeof value === 'object' && !Array.isArray(value)) {
			out[key] = JSON.stringify(value);
		}
	}
	return out;
}

export function createBrowserSettingsWriter(): SettingsWriter {
	return {
		async write(device, key, value) {
			const client = new FullyKioskClient(proxyOrigin(device.baseUrl), device.password);
			const res = await client.postForm('setStringSetting', { key, value });
			if (res.status === 'NOK') {
				throw new Error(res.statustext ?? 'NOK');
			}
		},
		async read(device) {
			const client = new FullyKioskClient(proxyOrigin(device.baseUrl), device.password);
			const body = await client.listSettings();
			return settingsFromListBody(body);
		}
	};
}
