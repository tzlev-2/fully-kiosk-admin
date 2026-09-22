import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VolumeCfg } from './booster-config';
import { KioskDevice, type DeviceRecord } from './kiosk-device.svelte';
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
			volume: { gameLevel: 10, otherLevel: 20, stream: 3 }
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
			volume: { gameLevel: 10, otherLevel: 20, stream: 3 }
		});
		const writer = fakeWriter({});
		await device.loadVolumeCfg(writer);
		expect(device.volumeCfg.gameLevel).toBe(80);
	});

	it('loadVolumeCfg keeps cache when read throws', async () => {
		const device = makeDevice({
			key: 'a',
			volume: { gameLevel: 10, otherLevel: 20, stream: 3 }
		});
		const writer = fakeWriter(new Error('network'));
		await device.loadVolumeCfg(writer);
		expect(device.volumeCfg.gameLevel).toBe(10);
	});

	it('saveVolumeCfg updates state only after successful write', async () => {
		const device = makeDevice({ key: 'a' });
		const next: VolumeCfg = { gameLevel: 55, otherLevel: 30, stream: 3 };
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
});
