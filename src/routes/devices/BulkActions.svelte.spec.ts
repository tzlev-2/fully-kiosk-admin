import { render } from 'vitest-browser-svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceInfoResponse } from '$lib/fully-kiosk-types';
import { kiosk } from '$lib/kiosk-store.svelte';
import { KIOSK_TEXTS } from '$lib/texts';
import BulkActions from './BulkActions.svelte';

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

describe('BulkActions', () => {
	beforeEach(() => {
		localStorage.clear();
		kiosk.devices = [];
		kiosk.websites = [];
		kiosk.lastDeviceKey = null;
		kiosk.feedback = null;
		vi.unstubAllGlobals();
	});

	it('SCREEN_ALL_ON fetches screenOn only for connected devices', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		const b = kiosk.addDevice({
			baseUrl: 'http://10.1.0.2:2323',
			password: 'b',
			name: 'B'
		});
		kiosk.addDevice({
			baseUrl: 'http://10.1.0.3:2323',
			password: 'c',
			name: 'C'
		});
		a.deviceInfo = mockDeviceInfo('info-a');
		b.deviceInfo = mockDeviceInfo('info-b');

		const calls: string[] = [];
		vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
			const url = String(input);
			calls.push(url);
			return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
		});

		const screen = render(BulkActions);
		await screen.getByRole('button', { name: KIOSK_TEXTS.SCREEN_ALL_ON }).click();

		const connectedCalls = calls.filter((url) => url.includes('cmd='));
		expect(connectedCalls).toHaveLength(2);
		for (const url of connectedCalls) {
			expect(url).toContain('cmd=screenOn');
		}
		expect(connectedCalls.some((url) => url.includes('10.1.0.1'))).toBe(true);
		expect(connectedCalls.some((url) => url.includes('10.1.0.2'))).toBe(true);
		expect(calls.some((url) => url.includes('10.1.0.3'))).toBe(false);
		expect(calls.some((url) => url.includes('cmd=screenOff'))).toBe(false);
		expect(calls.some((url) => url.includes('cmd=lock'))).toBe(false);
	});
});
