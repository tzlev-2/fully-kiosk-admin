<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { resolve } from '$app/paths';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import { captureGapMs, runCaptureRound } from './capture-gap';

	let screenshots = $state<Record<string, string | null>>({});
	let capturingKeys = $state<Record<string, boolean>>({});
	let running = false;

	const connectedDevices = $derived(kiosk.devices.filter((d) => d.deviceInfo));

	async function wait(ms: number): Promise<void> {
		await new Promise((resolveWait) => setTimeout(resolveWait, ms));
	}

	async function captureDevice(device: (typeof kiosk.devices)[number]): Promise<void> {
		capturingKeys = { ...capturingKeys, [device.key]: true };
		const url = await device.takeScreenshot();
		if (url) {
			const prev = screenshots[device.key];
			if (prev) URL.revokeObjectURL(prev);
			screenshots = { ...screenshots, [device.key]: url };
		}
		const { [device.key]: _, ...rest } = capturingKeys;
		capturingKeys = rest;
	}

	async function schedulerLoop(): Promise<void> {
		while (running) {
			const devices = kiosk.devices.filter((d) => d.deviceInfo);
			const n = devices.length;
			if (n === 0) {
				await wait(500);
				continue;
			}

			await runCaptureRound(
				devices.map((device) => () => captureDevice(device)),
				n,
				wait
			);

			if (!running) break;
			await wait(captureGapMs(n));
		}
	}

	function revokeAllScreenshots(): void {
		for (const url of Object.values(screenshots)) {
			if (url) URL.revokeObjectURL(url);
		}
		screenshots = {};
	}

	onMount(() => {
		running = true;
		void schedulerLoop();
	});

	onDestroy(() => {
		running = false;
		revokeAllScreenshots();
	});
</script>

<div class="flex flex-col gap-6 lg:col-span-2" dir="rtl">
	<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
		<div class="card-body gap-4">
			<h2 class="card-title text-base">📷 {KIOSK_TEXTS.TAB_SCREEN}</h2>

			{#if kiosk.devices.length === 0}
				<p class="text-sm text-base-content/60">{KIOSK_TEXTS.NO_DEVICES}</p>
				<a href={resolve('/devices')} class="btn btn-sm btn-primary">{KIOSK_TEXTS.DEVICES_TITLE}</a>
			{:else if connectedDevices.length === 0}
				<p class="text-sm text-base-content/60">{KIOSK_TEXTS.NONE_CONNECTED}</p>
				<a href={resolve('/devices')} class="btn btn-sm btn-primary">{KIOSK_TEXTS.DEVICES_TITLE}</a>
			{:else}
				<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{#each connectedDevices as device (device.key)}
						<DeviceScreen
							{device}
							screenshotUrl={screenshots[device.key] ?? null}
							isCapturing={!!capturingKeys[device.key]}
							href={resolve('/d/[id]/screen', { id: kiosk.routeId(device) })}
						/>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</div>
