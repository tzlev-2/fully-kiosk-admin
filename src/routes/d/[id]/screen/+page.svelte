<script lang="ts">
	import { onDestroy, getContext } from 'svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';

	const device = getContext<KioskDevice>('kiosk-device');

	let screenshotUrl = $state<string | null>(null);
	let liveViewActive = $state(false);
	let isCapturing = $state(false);
	let liveInterval: ReturnType<typeof setInterval> | null = null;

	async function capture() {
		isCapturing = true;
		const url = await device.takeScreenshot();
		if (url) {
			if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
			screenshotUrl = url;
		} else {
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		}
		isCapturing = false;
	}

	function startLiveView() {
		liveViewActive = true;
		capture();
		liveInterval = setInterval(capture, 1500);
	}

	function stopLiveView() {
		liveViewActive = false;
		if (liveInterval) {
			clearInterval(liveInterval);
			liveInterval = null;
		}
	}

	function toggleLiveView() {
		if (liveViewActive) stopLiveView();
		else startLiveView();
	}

	onDestroy(() => {
		stopLiveView();
		if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
	});
</script>

<div
	class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur lg:col-span-2"
>
	<div class="card-body gap-4">
		<h2 class="card-title text-base">📷 {KIOSK_TEXTS.TAB_SCREEN}</h2>

		<div class="flex flex-col gap-4">
			<div class="flex flex-wrap items-center gap-2">
				<button
					class="btn btn-sm btn-neutral"
					onclick={capture}
					disabled={isCapturing || liveViewActive}
				>
					{#if isCapturing && !liveViewActive}
						<span class="loading loading-xs loading-spinner"></span>
					{/if}
					📷 {KIOSK_TEXTS.SCREENSHOT_BTN}
				</button>

				<button
					class="btn btn-sm"
					class:btn-success={!liveViewActive}
					class:btn-error={liveViewActive}
					onclick={toggleLiveView}
					disabled={isCapturing && !liveViewActive}
				>
					{liveViewActive ? '⏹ ' + KIOSK_TEXTS.LIVE_VIEW_STOP : '▶ ' + KIOSK_TEXTS.LIVE_VIEW_START}
				</button>

				{#if liveViewActive}
					<span class="animate-pulse text-sm font-bold text-error"> ● LIVE </span>
				{/if}
			</div>

			<div
				class="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-base-300 bg-base-200"
			>
				{#if screenshotUrl}
					<img
						src={screenshotUrl}
						alt={KIOSK_TEXTS.SCREENSHOT_ALT}
						class="max-h-96 w-full object-contain"
					/>
				{:else}
					<div class="flex flex-col items-center gap-2 p-8 text-base-content/30">
						<span class="text-5xl opacity-40">📷</span>
						<p class="text-center text-sm">{KIOSK_TEXTS.SCREENSHOT_EMPTY}</p>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
