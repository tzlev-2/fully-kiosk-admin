import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceInfoResponse } from './fully-kiosk-types';
import { kiosk } from './kiosk-store.svelte';

function mockDeviceInfo(deviceId: string): DeviceInfoResponse {
	return {
		deviceId,
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
		ip4: '192.168.1.10',
		SSID: 'wifi'
	};
}

function resetKiosk() {
	localStorage.clear();
	kiosk.devices = [];
	kiosk.websites = [];
	kiosk.lastDeviceKey = null;
	kiosk.feedback = null;
}

describe('KioskStore', () => {
	beforeEach(() => {
		resetKiosk();
		vi.unstubAllGlobals();
	});

	it('migrates legacy url, password, and recents; removes old keys; keeps websites', () => {
		localStorage.setItem('fully-kiosk-url', 'http://192.168.1.50:2323');
		localStorage.setItem('fully-kiosk-password', 'secret');
		localStorage.setItem(
			'fully-kiosk-recent-apps',
			JSON.stringify([{ package: 'com.app', label: 'App', icon: 'x' }])
		);
		localStorage.setItem(
			'fully-kiosk-websites',
			JSON.stringify([{ label: 'Saved', url: 'https://saved.test/' }])
		);

		kiosk.load();

		expect(kiosk.devices).toHaveLength(1);
		expect(kiosk.devices[0].baseUrl).toBe('http://192.168.1.50:2323');
		expect(kiosk.devices[0].password).toBe('secret');
		expect(kiosk.devices[0].recentApps).toHaveLength(1);
		expect(localStorage.getItem('fully-kiosk-url')).toBeNull();
		expect(localStorage.getItem('fully-kiosk-password')).toBeNull();
		expect(localStorage.getItem('fully-kiosk-recent-apps')).toBeNull();
		expect(kiosk.websites).toEqual([{ label: 'Saved', url: 'https://saved.test/' }]);
	});

	it('skips migration when devices key exists and preserves saved websites', () => {
		const savedSites = [{ label: 'Custom', url: 'https://custom.test/' }];
		localStorage.setItem(
			'fully-kiosk-devices',
			JSON.stringify([
				{
					key: 'local-existing',
					formerKeys: [],
					name: 'Existing',
					baseUrl: 'http://10.0.0.1:2323',
					password: 'pw',
					recentApps: []
				}
			])
		);
		localStorage.setItem('fully-kiosk-websites', JSON.stringify(savedSites));
		localStorage.setItem('fully-kiosk-url', 'http://legacy:2323');
		localStorage.setItem('fully-kiosk-password', 'legacy-pass');

		kiosk.load();

		expect(kiosk.devices).toHaveLength(1);
		expect(kiosk.devices[0].key).toBe('local-existing');
		expect(localStorage.getItem('fully-kiosk-url')).toBe('http://legacy:2323');
		expect(localStorage.getItem('fully-kiosk-password')).toBe('legacy-pass');
		expect(kiosk.websites).toEqual(savedSites);
	});

	it('does not create a device when legacy url is empty; password remains', () => {
		localStorage.setItem('fully-kiosk-password', 'keep-me');

		kiosk.load();

		expect(kiosk.devices).toHaveLength(0);
		expect(localStorage.getItem('fully-kiosk-password')).toBe('keep-me');
	});

	it('migrates with empty recents when recent-apps JSON is broken', () => {
		localStorage.setItem('fully-kiosk-url', 'http://192.168.1.60:2323');
		localStorage.setItem('fully-kiosk-password', 'pw');
		localStorage.setItem('fully-kiosk-recent-apps', '{not-json');

		kiosk.load();

		expect(kiosk.devices).toHaveLength(1);
		expect(kiosk.devices[0].recentApps).toEqual([]);
		expect(kiosk.devices[0].baseUrl).toBe('http://192.168.1.60:2323');
		expect(kiosk.devices[0].password).toBe('pw');
		expect(localStorage.getItem('fully-kiosk-url')).toBeNull();
		expect(localStorage.getItem('fully-kiosk-password')).toBeNull();
	});

	it('isolates runtime state between two devices', () => {
		const a = kiosk.addDevice({ baseUrl: 'http://a:2323', password: 'a' });
		const b = kiosk.addDevice({ baseUrl: 'http://b:2323', password: 'b' });

		a.appList = [{ icon: 'i', label: 'A', package: 'com.a', version: '1', versionCode: 1 }];
		a.deviceInfo = { ...mockDeviceInfo('id-a'), audioVolumes: [{ '3': 42 }] };

		expect(a.volumeLevel).toBe(42);
		expect(b.appList).toEqual([]);
		expect(b.volumeLevel).toBe(70);
		expect(b.deviceInfo).toBeNull();
	});

	it('resolves byRouteId via deviceId, key, formerKeys, and null for unknown', () => {
		const d = kiosk.addDevice({ baseUrl: 'http://x:2323', password: 'p', name: 'X' });
		d.deviceId = 'dev-123';
		d.formerKeys = ['old-key'];

		expect(kiosk.byRouteId('dev-123')).toBe(d);
		expect(kiosk.byRouteId(d.key)).toBe(d);
		expect(kiosk.byRouteId('old-key')).toBe(d);
		expect(kiosk.byRouteId('missing')).toBeNull();
	});

	it('applyIdentity with empty deviceId leaves two records unchanged', () => {
		const a = kiosk.addDevice({ baseUrl: 'http://a:2323', password: 'a' });
		const b = kiosk.addDevice({ baseUrl: 'http://b:2323', password: 'b' });
		a.deviceInfo = { ...mockDeviceInfo(''), deviceId: '' };

		const result = kiosk.applyIdentity(a);

		expect(result).toBe(a);
		expect(kiosk.devices).toHaveLength(2);
		expect(a.key).toBeTruthy();
		expect(b.key).toBeTruthy();
		expect(a.deviceId).toBeNull();
	});

	it('applyIdentity assigns new deviceId and routeId uses it', () => {
		const d = kiosk.addDevice({ baseUrl: 'http://new:2323', password: 'p' });
		const keyBefore = d.key;
		d.deviceInfo = mockDeviceInfo('fresh-id');

		kiosk.applyIdentity(d);

		expect(d.deviceId).toBe('fresh-id');
		expect(d.key).toBe(keyBefore);
		expect(kiosk.routeId(d)).toBe('fresh-id');
	});

	it('applyIdentity merges same deviceId from two baseUrls; ip4 is not compared', () => {
		const survivor = kiosk.addDevice({ baseUrl: 'http://192.168.1.50:2323', password: 'lan-pw' });
		survivor.deviceId = 'stable-tablet-id';
		survivor.deviceInfo = { ...mockDeviceInfo('stable-tablet-id'), ip4: '192.168.1.107' };

		const incoming = kiosk.addDevice({ baseUrl: 'http://10.8.0.4:2323', password: 'wg-pw' });
		incoming.deviceInfo = { ...mockDeviceInfo('stable-tablet-id'), ip4: '10.8.0.4' };

		const result = kiosk.applyIdentity(incoming);

		expect(kiosk.devices).toHaveLength(1);
		expect(result).toBe(survivor);
		expect(survivor.baseUrl).toBe('http://10.8.0.4:2323');
		expect(survivor.password).toBe('wg-pw');
		expect(survivor.formerKeys).toContain(incoming.key);
	});

	it('connectDevice sets deviceId from getDeviceInfo response', async () => {
		const device = kiosk.addDevice({ baseUrl: 'http://tablet:2323', password: 'pw' });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				json: async () => mockDeviceInfo('from-network')
			}))
		);

		const connected = await kiosk.connectDevice(device);

		expect(connected.deviceId).toBe('from-network');
		expect(kiosk.routeId(connected)).toBe('from-network');
	});

	it('connectAll connects one device and errors the other without rejecting', async () => {
		const okDevice = kiosk.addDevice({ baseUrl: 'http://good:2323', password: 'pw' });
		const badDevice = kiosk.addDevice({ baseUrl: 'http://bad:2323', password: 'pw' });

		vi.stubGlobal(
			'fetch',
			vi.fn(async (input: RequestInfo | URL) => {
				const url = String(input);
				if (url.includes('good:2323')) {
					return { ok: true, json: async () => mockDeviceInfo('good-id') };
				}
				throw new Error('network fail');
			})
		);

		await expect(kiosk.connectAll()).resolves.toBeUndefined();

		expect(okDevice.connectionStatus).toBe('connected');
		expect(okDevice.deviceId).toBe('good-id');
		expect(badDevice.connectionStatus).toBe('error-proxy');
	});

	it('bulk screenOn counts only connected devices and skips fetch for offline', async () => {
		const online = kiosk.addDevice({ baseUrl: 'http://online:2323', password: 'pw' });
		kiosk.addDevice({ baseUrl: 'http://offline:2323', password: 'pw' });
		online.deviceInfo = mockDeviceInfo('online-id');

		const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ status: 'OK' }) }));
		vi.stubGlobal('fetch', fetchMock);

		const result = await kiosk.bulk((d) => d.screenOn());

		expect(result).toEqual({ ok: 1, total: 2 });
		expect(fetchMock).toHaveBeenCalledTimes(1);
		const callUrl = String((fetchMock.mock.calls as unknown[][])[0][0]);
		expect(callUrl).toContain('online:2323');
	});

	it('navigateToUrl, restartApp, and setVolume skip fetch without deviceInfo', async () => {
		const offline = kiosk.addDevice({ baseUrl: 'http://offline:2323', password: 'pw' });
		const volumeBefore = offline.volumeLevel;

		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		expect(await offline.navigateToUrl('https://example.com')).toBe(false);
		expect(await offline.restartApp()).toBe(false);
		expect(await offline.setVolume(42)).toBe(false);

		expect(fetchMock).not.toHaveBeenCalled();
		expect(offline.volumeLevel).toBe(volumeBefore);
	});

	it('bulk treats thrown run as failure and still resolves', async () => {
		kiosk.addDevice({ baseUrl: 'http://a:2323', password: 'pw' });
		kiosk.addDevice({ baseUrl: 'http://b:2323', password: 'pw' });

		const result = await kiosk.bulk(async () => {
			throw new Error('boom');
		});

		expect(result).toEqual({ ok: 0, total: 2 });
	});

	it('renameDevice persists name and keeps routeId', () => {
		const device = kiosk.addDevice({
			baseUrl: 'http://rename:2323',
			password: 'pw',
			name: 'Before'
		});
		const routeBefore = kiosk.routeId(device);

		kiosk.renameDevice(device.key, 'After');
		expect(device.name).toBe('After');

		kiosk.devices = [];
		kiosk.lastDeviceKey = null;
		kiosk.load();

		expect(kiosk.devices).toHaveLength(1);
		expect(kiosk.devices[0].name).toBe('After');
		expect(kiosk.routeId(kiosk.devices[0])).toBe(routeBefore);
	});

	it('removeDevice moves lastDeviceKey to survivor when deleting last active device', () => {
		const first = kiosk.addDevice({ baseUrl: 'http://first:2323', password: 'pw' });
		const second = kiosk.addDevice({ baseUrl: 'http://second:2323', password: 'pw' });
		kiosk.lastDeviceKey = second.key;

		kiosk.removeDevice(second.key);

		expect(kiosk.lastDeviceKey).toBe(first.key);
		expect(kiosk.devices).toHaveLength(1);
	});

	it('removeDevice leaves lastDeviceKey when deleting a non-active device', () => {
		const first = kiosk.addDevice({ baseUrl: 'http://first:2323', password: 'pw' });
		const second = kiosk.addDevice({ baseUrl: 'http://second:2323', password: 'pw' });
		kiosk.lastDeviceKey = second.key;

		kiosk.removeDevice(first.key);

		expect(kiosk.lastDeviceKey).toBe(second.key);
	});

	it('removeDevice clears lastDeviceKey when deleting the only device', () => {
		const only = kiosk.addDevice({ baseUrl: 'http://only:2323', password: 'pw' });
		kiosk.lastDeviceKey = only.key;

		kiosk.removeDevice(only.key);

		expect(kiosk.lastDeviceKey).toBeNull();
		expect(kiosk.devices).toHaveLength(0);
	});
});
