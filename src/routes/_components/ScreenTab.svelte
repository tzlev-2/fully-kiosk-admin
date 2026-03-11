<script lang="ts">
	import { onDestroy } from 'svelte';
	import { ctrl } from '$lib/kioskController.svelte';
	import { KIOSK_TEXTS } from '$lib/texts';

	let screenshotUrl = $state<string | null>(null);
	let liveViewActive = $state(false);
	let isCapturing = $state(false);
	let liveInterval: ReturnType<typeof setInterval> | null = null;

	async function capture() {
		isCapturing = true;
		const url = await ctrl.takeScreenshot();
		if (url) {
			if (screenshotUrl) URL.revokeObjectURL(screenshotUrl);
			screenshotUrl = url;
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

<div class="flex flex-col gap-4">
	<div class="flex flex-wrap gap-2 items-center">
		<button
			class="btn btn-neutral btn-sm"
			onclick={capture}
			disabled={isCapturing || liveViewActive}
		>
			{#if isCapturing && !liveViewActive}
				<span class="loading loading-spinner loading-xs"></span>
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
			<span class="text-sm font-bold text-error animate-pulse">
				● LIVE
			</span>
		{/if}
	</div>

	<div class="border border-base-300 rounded-xl overflow-hidden bg-base-200 min-h-48 flex items-center justify-center">
		{#if screenshotUrl}
			<img src={screenshotUrl} alt="צילום מסך" class="w-full max-h-96 object-contain" />
		{:else}
			<div class="flex flex-col items-center gap-2 p-8 text-base-content/30">
				<span class="text-5xl opacity-40">📷</span>
				<p class="text-sm text-center">{KIOSK_TEXTS.SCREENSHOT_EMPTY}</p>
			</div>
		{/if}
	</div>
</div>
