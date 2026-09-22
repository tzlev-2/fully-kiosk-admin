import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceRecord } from './kiosk-device.svelte';
import {
	createBrowserSettingsWriter,
	settingsFromListBody
} from './settings-writer';
import { FullyKioskClient } from './fully-kiosk-client';

const device: DeviceRecord = {
	key: 'dev-1',
	formerKeys: [],
	name: 'Test',
	baseUrl: 'http://10.1.0.1:2323',
	password: 'secret',
	recentApps: []
};

describe('settingsFromListBody', () => {
	it('flat body returns boosterVolumeCfg string', () => {
		const body = { boosterVolumeCfg: '{"gameLevel":90}' };
		expect(settingsFromListBody(body).boosterVolumeCfg).toBe('{"gameLevel":90}');
	});

	it('wrapped settings body returns boosterVolumeCfg string', () => {
		const body = { settings: { boosterVolumeCfg: '{"gameLevel":90}' } };
		expect(settingsFromListBody(body).boosterVolumeCfg).toBe('{"gameLevel":90}');
	});
});

describe('createBrowserSettingsWriter', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('write posts to proxy port 8765 with setStringSetting', async () => {
		const calls: RequestInit[] = [];
		vi.stubGlobal(
			'fetch',
			async (_input: RequestInfo | URL, init?: RequestInit) => {
				calls.push(init ?? {});
				const url = new URL(String(_input));
				expect(url.port).toBe('8765');
				expect(url.href).not.toContain(':2323');
				return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
			}
		);

		const writer = createBrowserSettingsWriter();
		await writer.write(device, 'boosterVolumeCfg', '{"gameLevel":80}');

		expect(calls).toHaveLength(1);
		expect(calls[0].method).toBe('POST');
		const body = String(calls[0].body);
		expect(body).toContain('cmd=setStringSetting');
		expect(body).toContain('key=boosterVolumeCfg');
	});

	it('read returns parsed settings map', async () => {
		vi.stubGlobal(
			'fetch',
			async () =>
				new Response(JSON.stringify({ boosterVolumeCfg: '{"gameLevel":90}' }), {
					status: 200
				})
		);

		const writer = createBrowserSettingsWriter();
		const settings = await writer.read(device);
		expect(settings.boosterVolumeCfg).toBe('{"gameLevel":90}');
	});
});

describe('FullyKioskClient.postForm', () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it('uses POST, not GET via request', async () => {
		let method = '';
		vi.stubGlobal('fetch', async (_input: RequestInfo | URL, init?: RequestInit) => {
			method = init?.method ?? 'GET';
			return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
		});

		const client = new FullyKioskClient('http://10.1.0.1:8765', 'pw');
		await client.postForm('setStringSetting', { key: 'boosterVolumeCfg', value: '{}' });

		expect(method).toBe('POST');
	});
});
