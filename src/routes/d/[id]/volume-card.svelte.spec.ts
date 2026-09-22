import { render } from 'vitest-browser-svelte';
import { tick } from 'svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceInfoResponse } from '$lib/fully-kiosk-types';
import { kiosk } from '$lib/kiosk-store.svelte';
import { KIOSK_TEXTS } from '$lib/texts';
import { page } from './page-stub.svelte';
import Harness from './volume-route-harness.svelte';

vi.mock('$app/state', async () => {
	const stub = await import('./page-stub.svelte');
	return { page: stub.page };
});

type FetchCall = { url: string; method: string; body: string };

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

function installFetch(options: {
	listByHost?: Record<string, string>;
	postFails?: boolean;
}): FetchCall[] {
	const calls: FetchCall[] = [];
	vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
		const url = new URL(String(input));
		const method = init?.method ?? 'GET';
		const body = init?.body != null ? String(init.body) : '';
		calls.push({ url: url.href, method, body });

		if (method === 'POST') {
			if (options.postFails) {
				return new Response(JSON.stringify({ status: 'NOK', statustext: 'fail' }), {
					status: 200
				});
			}
			return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
		}

		const cmd = url.searchParams.get('cmd');
		if (cmd === 'listSettings') {
			const raw =
				options.listByHost?.[url.hostname] ??
				'{"gameLevel":80,"otherLevel":20,"maxLevel":100,"stream":3}';
			return new Response(JSON.stringify({ boosterVolumeCfg: raw }), { status: 200 });
		}

		return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
	});
	return calls;
}

function postCalls(calls: FetchCall[]): FetchCall[] {
	return calls.filter((c) => c.method === 'POST');
}

function parseBoosterValue(body: string): { gameLevel: number } {
	const params = new URLSearchParams(body);
	return JSON.parse(params.get('value') ?? '{}') as { gameLevel: number };
}

async function setSliderValue(screen: ReturnType<typeof render>, testId: string, value: string) {
	const slider = screen.getByTestId(testId);
	const el = slider.element() as HTMLInputElement;
	el.value = value;
	el.dispatchEvent(new Event('input', { bubbles: true }));
	el.dispatchEvent(new Event('change', { bubbles: true }));
	await tick();
	await tick();
}

async function openAdvanced(screen: ReturnType<typeof render>) {
	await screen.getByTestId('volume-advanced').click();
}

describe('volume card route', () => {
	beforeEach(() => {
		localStorage.clear();
		kiosk.devices = [];
		kiosk.websites = [];
		kiosk.lastDeviceKey = null;
		kiosk.feedback = null;
		vi.unstubAllGlobals();
	});

	it('G7: slider write targets the routed device on port 8765', async () => {
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

		const calls = installFetch({
			listByHost: {
				'10.1.0.1': '{"gameLevel":80,"otherLevel":20,"maxLevel":100,"stream":3}',
				'10.1.0.2': '{"gameLevel":25,"otherLevel":20,"maxLevel":100,"stream":3}'
			}
		});

		show(a.key);
		const screen = render(Harness);
		await openAdvanced(screen);

		await expect.element(screen.getByTestId('volume-game')).toHaveValue('80');

		calls.length = 0;
		await setSliderValue(screen, 'volume-game', '95');

		const posts = postCalls(calls);
		expect(posts).toHaveLength(1);
		const first = new URL(posts[0].url);
		expect(first.hostname).toBe('10.1.0.1');
		expect(first.port).toBe('8765');
		expect(first.href).not.toContain('10.1.0.2');
		expect(posts[0].body).toContain('cmd=setStringSetting');
		expect(posts[0].body).toContain('key=boosterVolumeCfg');
		expect(parseBoosterValue(posts[0].body).gameLevel).toBe(95);

		show(b.key);
		await tick();
		await openAdvanced(screen);
		await expect.element(screen.getByTestId('volume-game')).toHaveValue('25');

		calls.length = 0;
		await setSliderValue(screen, 'volume-game', '15');

		const postsB = postCalls(calls);
		expect(postsB).toHaveLength(1);
		const only = new URL(postsB[0].url);
		expect(only.hostname).toBe('10.1.0.2');
		expect(only.port).toBe('8765');
		expect(parseBoosterValue(postsB[0].body).gameLevel).toBe(15);
		expect(postsB.some((p) => p.url.includes('10.1.0.1'))).toBe(false);
	});

	it('G8-cache: device listSettings overrides cached volume in localStorage', async () => {
		const key = 'local-cache-a';
		localStorage.setItem(
			'fully-kiosk-devices',
			JSON.stringify([
				{
					key,
					formerKeys: [],
					name: 'A',
					baseUrl: 'http://10.1.0.1:2323',
					password: 'a',
					recentApps: [],
					volume: { gameLevel: 10, otherLevel: 20, maxLevel: 100, stream: 3 }
				}
			])
		);
		kiosk.load();
		const a = kiosk.devices[0];
		a.deviceInfo = mockDeviceInfo('info-a');

		installFetch({
			listByHost: {
				'10.1.0.1': '{"gameLevel":90,"otherLevel":25,"maxLevel":100,"stream":3}'
			}
		});

		show(a.key);
		const screen = render(Harness);
		await openAdvanced(screen);

		await expect.element(screen.getByTestId('volume-game')).toHaveValue('90');
	});

	it('volume up uses setAudioVolume without boosterVolumeCfg', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');

		const calls = installFetch({});
		show(a.key);
		const screen = render(Harness);
		await expect.element(screen.getByTestId('volume-now')).toHaveValue('70');

		calls.length = 0;
		await screen.getByTestId('volume-now-up').click();

		expect(calls.some((c) => c.url.includes('cmd=setAudioVolume'))).toBe(true);
		expect(calls.some((c) => c.body.includes('boosterVolumeCfg'))).toBe(false);
	});

	it('write failure keeps the displayed slider value', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');

		installFetch({ postFails: true });
		show(a.key);
		const screen = render(Harness);
		await openAdvanced(screen);
		await expect.element(screen.getByTestId('volume-game')).toHaveValue('80');

		await setSliderValue(screen, 'volume-game', '95');
		await expect.element(screen.getByTestId('volume-game')).toHaveValue('80');
		expect(kiosk.feedback?.type).toBe('error');
		expect(kiosk.feedback?.message).toBe(KIOSK_TEXTS.ERROR_COMMAND);
	});

	it('G5ב: game/reward/max are absent from the DOM until "advanced" opens', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');
		installFetch({});

		show(a.key);
		const screen = render(Harness);

		await expect.element(screen.getByTestId('volume-now')).toBeInTheDocument();
		expect(screen.container.querySelector('[data-testid="volume-game"]')).toBeNull();
		expect(screen.container.querySelector('[data-testid="volume-reward"]')).toBeNull();
		expect(screen.container.querySelector('[data-testid="volume-max"]')).toBeNull();

		await openAdvanced(screen);

		await expect.element(screen.getByTestId('volume-game')).toBeInTheDocument();
		expect(screen.container.querySelector('[data-testid="volume-reward"]')).not.toBeNull();
		expect(screen.container.querySelector('[data-testid="volume-max"]')).not.toBeNull();
	});

	it('G5: four range inputs render in the card once advanced is open', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');
		installFetch({});

		show(a.key);
		const screen = render(Harness);
		await openAdvanced(screen);
		await expect.element(screen.getByTestId('volume-game')).toBeInTheDocument();

		expect(screen.container.querySelectorAll('input[type="range"]').length).toBe(4);
	});

	it('G6: lowering the ceiling destructively clamps game/reward and the UI shows it', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');
		const calls = installFetch({
			listByHost: { '10.1.0.1': '{"gameLevel":80,"otherLevel":20,"maxLevel":100,"stream":3}' }
		});

		show(a.key);
		const screen = render(Harness);
		await openAdvanced(screen);
		await expect.element(screen.getByTestId('volume-game')).toHaveValue('80');

		calls.length = 0;
		await setSliderValue(screen, 'volume-max', '50');

		await expect.element(screen.getByTestId('volume-max')).toHaveValue('50');
		await expect.element(screen.getByTestId('volume-game')).toHaveValue('50');

		const boosterPost = postCalls(calls).find((p) => p.body.includes('key=boosterVolumeCfg'));
		expect(boosterPost).toBeDefined();
		expect(parseBoosterValue(boosterPost!.body).gameLevel).toBe(50);
	});

	it('G9: max change writes volumeLimits=3:<n>', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');
		const calls = installFetch({
			listByHost: { '10.1.0.1': '{"gameLevel":80,"otherLevel":20,"maxLevel":100,"stream":3}' }
		});

		show(a.key);
		const screen = render(Harness);
		await openAdvanced(screen);
		await expect.element(screen.getByTestId('volume-max')).toHaveValue('100');

		calls.length = 0;
		await setSliderValue(screen, 'volume-max', '60');

		await vi.waitFor(() => {
			expect(postCalls(calls).some((p) => p.body.includes('key=volumeLimits'))).toBe(true);
		});
		const limitsPost = postCalls(calls).find((p) => p.body.includes('key=volumeLimits'));
		expect(limitsPost).toBeDefined();
		const params = new URLSearchParams(limitsPost!.body);
		expect(params.get('value')).toBe('3:60');
	});

	it('G8: "now" reflects audioVolumes stream 3, not the 70 default', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = { ...mockDeviceInfo('info-a'), audioVolumes: [{ '3': 100 }] };
		installFetch({});

		show(a.key);
		const screen = render(Harness);

		await expect.element(screen.getByTestId('volume-now')).toHaveValue('100');
	});

	it('G8ב: a command refresh updates "now" without further user action', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');

		vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			if (method === 'POST') {
				return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
			}
			const cmd = url.searchParams.get('cmd');
			if (cmd === 'listSettings') {
				return new Response(
					JSON.stringify({
						boosterVolumeCfg: '{"gameLevel":80,"otherLevel":20,"maxLevel":100,"stream":3}'
					}),
					{ status: 200 }
				);
			}
			if (cmd === 'getDeviceInfo') {
				return new Response(
					JSON.stringify({ ...mockDeviceInfo('info-a'), audioVolumes: [{ '3': 55 }] }),
					{ status: 200 }
				);
			}
			return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
		});

		show(a.key);
		const screen = render(Harness);
		await expect.element(screen.getByTestId('volume-now')).toHaveValue('70');

		await screen.getByTestId('volume-now-up').click();

		await expect.element(screen.getByTestId('volume-now')).toHaveValue('55');
	});

	it('G8ג: optimistic value shows immediately, then the real refreshed value replaces it', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');

		let resolveInfo!: () => void;
		const infoGate = new Promise<void>((resolve) => {
			resolveInfo = resolve;
		});

		vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = new URL(String(input));
			const method = init?.method ?? 'GET';
			if (method === 'POST') {
				return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
			}
			const cmd = url.searchParams.get('cmd');
			if (cmd === 'listSettings') {
				return new Response(
					JSON.stringify({
						boosterVolumeCfg: '{"gameLevel":80,"otherLevel":20,"maxLevel":100,"stream":3}'
					}),
					{ status: 200 }
				);
			}
			if (cmd === 'getDeviceInfo') {
				await infoGate;
				return new Response(
					JSON.stringify({ ...mockDeviceInfo('info-a'), audioVolumes: [{ '3': 86 }] }),
					{ status: 200 }
				);
			}
			return new Response(JSON.stringify({ status: 'OK' }), { status: 200 });
		});

		show(a.key);
		const screen = render(Harness);
		await expect.element(screen.getByTestId('volume-now')).toHaveValue('70');

		await setSliderValue(screen, 'volume-now', '90');
		await expect.element(screen.getByTestId('volume-now')).toHaveValue('90');

		resolveInfo();
		await expect.element(screen.getByTestId('volume-now')).toHaveValue('86');
	});

	it('G10: control caption is a real accessible label, not a hidden down-button trigger', async () => {
		const a = kiosk.addDevice({
			baseUrl: 'http://10.1.0.1:2323',
			password: 'a',
			name: 'A'
		});
		a.deviceInfo = mockDeviceInfo('info-a');
		const calls = installFetch({
			listByHost: { '10.1.0.1': '{"gameLevel":80,"otherLevel":20,"maxLevel":100,"stream":3}' }
		});

		show(a.key);
		const screen = render(Harness);
		await openAdvanced(screen);
		await expect.element(screen.getByTestId('volume-game')).toBeInTheDocument();

		const labelByTestId: Record<string, string> = {
			'volume-now': KIOSK_TEXTS.VOLUME_NOW_LABEL,
			'volume-game': KIOSK_TEXTS.VOLUME_GAME_LABEL,
			'volume-reward': KIOSK_TEXTS.VOLUME_REWARD_LABEL,
			'volume-max': KIOSK_TEXTS.VOLUME_MAX_LABEL
		};
		for (const [testId, labelText] of Object.entries(labelByTestId)) {
			const input = screen.getByTestId(testId).element() as HTMLInputElement;
			expect(input.labels?.length).toBe(1);
			expect(input.labels?.[0].tagName).toBe('LABEL');
			expect(input.labels?.[0].textContent).toBe(labelText);
		}

		calls.length = 0;
		await screen.getByText(KIOSK_TEXTS.VOLUME_GAME_LABEL).click();
		expect(calls.length).toBe(0);
	});
});
