import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VolumeCfg } from './booster-config';
import { KioskDevice, type DeviceRecord } from './kiosk-device.svelte';
import type { DeviceInfoResponse } from './fully-kiosk-types';
import type { SettingsWriter } from './settings-writer';

function makeDevice(record: Partial<DeviceRecord> & Pick<DeviceRecord, 'key'>) {
	const full: DeviceRecord = {
		formerKeys: [],
		name: 'Test',
		baseUrl: 'http://10.1.0.1:2323',
		password: 'pw',
		recentApps: [],
		...record
	};
	return new KioskDevice(full, { persist: vi.fn(), onInfo: vi.fn() });
}

function baseDeviceInfo(audioVolumes: Record<string, number>[]): DeviceInfoResponse {
	return {
		deviceId: 'd1',
		deviceName: 'Tablet',
		model: 'Test',
		manufacturer: 'ACME',
		androidVersion: '13',
		version: '1.0',
		screenOn: true,
		plugged: true,
		batteryLevel: 80,
		kioskLocked: false,
		kioskMode: true,
		maintenanceMode: false,
		currentPageUrl: 'https://example.com',
		startUrl: 'https://example.com',
		isInScreensaver: false,
		isInForcedSleep: false,
		isInDaydream: false,
		ip4: '10.1.0.1',
		SSID: 'wifi',
		audioVolumes
	};
}

function fakeWriter(readResult: Record<string, string> | Error): SettingsWriter {
	return {
		read: vi.fn(async () => {
			if (readResult instanceof Error) throw readResult;
			return readResult;
		}),
		write: vi.fn(async () => {
			if (readResult instanceof Error) throw readResult;
		})
	};
}

describe('KioskDevice volume cache', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('toRecord preserves volume from record before loadVolumeCfg', () => {
		const device = makeDevice({
			key: 'a',
			volume: { gameLevel: 10, otherLevel: 20, maxLevel: 100, stream: 3 }
		});
		expect(device.toRecord().volume?.gameLevel).toBe(10);
		expect(device.volumeCfg.gameLevel).toBe(10);
	});

	it('loadVolumeCfg applies device value when key present', async () => {
		const device = makeDevice({ key: 'a' });
		const writer = fakeWriter({
			boosterVolumeCfg: '{"gameLevel":90,"otherLevel":25,"stream":3}'
		});
		await device.loadVolumeCfg(writer);
		expect(device.volumeCfg.gameLevel).toBe(90);
		expect(device.volumeCfg.otherLevel).toBe(25);
	});

	it('loadVolumeCfg resets to defaults when key missing', async () => {
		const device = makeDevice({
			key: 'a',
			volume: { gameLevel: 10, otherLevel: 20, maxLevel: 100, stream: 3 }
		});
		const writer = fakeWriter({});
		await device.loadVolumeCfg(writer);
		expect(device.volumeCfg.gameLevel).toBe(80);
	});

	it('loadVolumeCfg keeps cache when read throws', async () => {
		const device = makeDevice({
			key: 'a',
			volume: { gameLevel: 10, otherLevel: 20, maxLevel: 100, stream: 3 }
		});
		const writer = fakeWriter(new Error('network'));
		await device.loadVolumeCfg(writer);
		expect(device.volumeCfg.gameLevel).toBe(10);
	});

	it('saveVolumeCfg updates state only after successful write', async () => {
		const device = makeDevice({ key: 'a' });
		const next: VolumeCfg = { gameLevel: 55, otherLevel: 30, maxLevel: 100, stream: 3 };
		const writer: SettingsWriter = {
			read: vi.fn(),
			write: vi.fn(async () => {
				throw new Error('fail');
			})
		};
		const before = device.volumeCfg.gameLevel;
		await expect(device.saveVolumeCfg(writer, next)).rejects.toThrow();
		expect(device.volumeCfg.gameLevel).toBe(before);
	});

	it('saveVolumeCfg reflects the value the device already accepted, even when the second write fails', async () => {
		const device = makeDevice({
			key: 'a',
			volume: { gameLevel: 80, otherLevel: 20, maxLevel: 100, stream: 3 }
		});
		const next: VolumeCfg = { gameLevel: 80, otherLevel: 20, maxLevel: 50, stream: 3 };
		const writer: SettingsWriter = {
			read: vi.fn(),
			write: vi.fn(async (_device, key: string) => {
				if (key === 'volumeLimits') throw new Error('NOK');
			})
		};
		await expect(device.saveVolumeCfg(writer, next)).rejects.toThrow();
		// boosterVolumeCfg (the first write) succeeded — the display must not lie about it,
		// even though the second write (volumeLimits) failed and the promise rejects.
		expect(device.volumeCfg.maxLevel).toBe(50);
		expect(device.volumeCfg.gameLevel).toBe(50); // clamped to the new max
	});

	it('setVolume treats {"status":"NOK"} on HTTP 200 as a failure, not a successful write', async () => {
		const device = makeDevice({ key: 'a', baseUrl: 'http://10.1.0.1:2323' });
		device.deviceInfo = baseDeviceInfo([{ '3': 55 }]);

		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(JSON.stringify({ status: 'NOK', statustext: 'fail' }), { status: 200 })
			)
		);

		const ok = await device.setVolume(40);
		expect(ok).toBe(false);
		expect(device.volumeLevel).toBe(55); // back to the derived value, not stuck on the rejected 40
	});

	it('setVolume does not leave a stale optimistic value when the background refresh fails', async () => {
		const device = makeDevice({ key: 'a', baseUrl: 'http://10.1.0.1:2323' });
		device.deviceInfo = baseDeviceInfo([{ '3': 55 }]);

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = new URL(String(input));
				if (url.searchParams.get('cmd') === 'setAudioVolume') {
					return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
				}
				throw new Error('network down');
			})
		);

		const ok = await device.setVolume(65);
		expect(ok).toBe(true);
		expect(device.volumeLevel).toBe(65); // optimistic, shown immediately

		await vi.waitFor(() => {
			expect(device.volumeLevel).toBe(55); // refresh failed — falls back to the derived value, not stuck on 65
		});
	});
});
