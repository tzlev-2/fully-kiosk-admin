<script lang="ts">
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { KIOSK_TEXTS } from '$lib/texts';

	let {
		device,
		screenshotUrl = null,
		isCapturing = false,
		showControls = false,
		liveViewActive = false,
		href = null,
		onCapture,
		onToggleLiveView
	}: {
		device: KioskDevice;
		screenshotUrl?: string | null;
		isCapturing?: boolean;
		showControls?: boolean;
		liveViewActive?: boolean;
		href?: string | null;
		onCapture?: () => void;
		onToggleLiveView?: () => void;
	} = $props();
</script>

<div
	class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur"
	class:lg:col-span-2={showControls}
>
	<div class="card-body gap-4">
		{#if href}
			<!-- href מגיע מ-resolve() בקורה -->
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a {href} class="link font-semibold link-hover">{device.name}</a>
		{:else}
			<h2 class="card-title text-base">📷 {KIOSK_TEXTS.TAB_SCREEN}</h2>
		{/if}

		<div class="flex flex-col gap-4">
			{#if showControls}
				<div class="flex flex-wrap items-center gap-2">
					<button
						class="btn btn-sm btn-neutral"
						onclick={onCapture}
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
						onclick={onToggleLiveView}
						disabled={isCapturing && !liveViewActive}
					>
						{liveViewActive
							? '⏹ ' + KIOSK_TEXTS.LIVE_VIEW_STOP
							: '▶ ' + KIOSK_TEXTS.LIVE_VIEW_START}
					</button>

					{#if liveViewActive}
						<span class="animate-pulse text-sm font-bold text-error"> ● LIVE </span>
					{/if}
				</div>
			{/if}

			<div
				class="flex min-h-48 items-center justify-center overflow-hidden rounded-xl border border-base-300 bg-base-200"
				class:min-h-32={!!href}
			>
				{#if screenshotUrl}
					<img
						src={screenshotUrl}
						alt={KIOSK_TEXTS.SCREENSHOT_ALT}
						class="max-h-96 w-full object-contain"
						class:max-h-48={!!href}
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
