<script lang="ts">
	import { onDestroy, getContext } from 'svelte';
	import DeviceScreen from '$lib/components/DeviceScreen.svelte';
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

<DeviceScreen
	{device}
	{screenshotUrl}
	{isCapturing}
	showControls={true}
	{liveViewActive}
	onCapture={capture}
	onToggleLiveView={toggleLiveView}
/>
