import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceInfoResponse } from '$lib/fullyKioskTypes';
import { kiosk } from '$lib/kiosk-store.svelte';
import { page } from './page-stub.svelte';
import Harness from './device-route-harness.svelte';

vi.mock('$app/state', async () => {
	const stub = await import('./page-stub.svelte');
	return { page: stub.page };
});

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

function show(id: string) {
	page.params.id = id;
}

describe('device route context', () => {
	beforeEach(() => {
		localStorage.clear();
		kiosk.devices = [];
		kiosk.websites = [];
		kiosk.lastDeviceKey = null;
		kiosk.feedback = null;
		vi.unstubAllGlobals();
	});

	it('sends the command to the device of the route after navigating without a remount', async () => {
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
		a.deviceInfo = mockDeviceInfo('info-a');
		b.deviceInfo = mockDeviceInfo('info-b');

		const calls: string[] = [];
		vi.stubGlobal('fetch', async (input: RequestInfo | URL) => {
			calls.push(String(input));
			return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
		});

		show(a.key);
		const screen = render(Harness);

		expect(kiosk.lastDeviceKey).toBe(a.key);
		await expect.element(screen.getByTestId('context-key')).toHaveTextContent(a.key);

		await screen.getByTestId('device-command').click();
		expect(calls.at(-1)).toContain('10.1.0.1');

		calls.length = 0;
		show(b.key);
		await tick();

		await expect.element(screen.getByTestId('context-key')).toHaveTextContent(b.key);
		expect(kiosk.lastDeviceKey).toBe(b.key);
		await screen.getByTestId('device-command').click();
		expect(calls.at(-1)).toContain('10.1.0.2');
	});
});
