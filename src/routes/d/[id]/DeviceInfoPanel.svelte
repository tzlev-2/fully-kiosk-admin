<script lang="ts">
	import type { DeviceInfoResponse } from '$lib/fully-kiosk-types';
	import { KIOSK_TEXTS } from '$lib/texts';
	import { splitIp4 } from './ip4';

	let {
		deviceInfo,
		onRefresh,
		isRefreshing
	}: {
		deviceInfo: DeviceInfoResponse;
		onRefresh: () => void;
		isRefreshing: boolean;
	} = $props();

	const ipAddresses = $derived(deviceInfo.ip4 ? splitIp4(deviceInfo.ip4) : []);
</script>

<div class="flex flex-col gap-3 rounded-xl border border-info/20 bg-info/10 p-4">
	<div class="flex min-w-0 items-center justify-between">
		<span class="min-w-0 flex-1 truncate text-base font-bold">{deviceInfo.deviceName}</span>
		<div class="mr-2 flex shrink-0 items-center gap-2">
			<span class="text-xs text-base-content/50">v{deviceInfo.version}</span>
			<button
				class="btn btn-square btn-ghost btn-xs"
				onclick={onRefresh}
				disabled={isRefreshing}
				title={KIOSK_TEXTS.REFRESH}
			>
				{#if isRefreshing}
					<span class="loading loading-xs loading-spinner"></span>
				{:else}
					🔄
				{/if}
			</button>
		</div>
	</div>

	<div class="flex flex-wrap gap-1.5">
		<span
			class="badge badge-sm"
			class:badge-warning={deviceInfo.kioskLocked}
			class:badge-success={!deviceInfo.kioskLocked}
		>
			{deviceInfo.kioskLocked
				? '🔒 ' + KIOSK_TEXTS.KIOSK_STATUS_LOCKED
				: '🔓 ' + KIOSK_TEXTS.KIOSK_STATUS_UNLOCKED}
		</span>
		<span
			class="badge badge-sm"
			class:badge-info={deviceInfo.screenOn}
			class:badge-ghost={!deviceInfo.screenOn}
		>
			{deviceInfo.screenOn ? '💡 ' + KIOSK_TEXTS.SCREEN_ON : '🌑 ' + KIOSK_TEXTS.SCREEN_OFF}
		</span>
		<span class="badge badge-outline badge-sm badge-success">
			🔋 {KIOSK_TEXTS.BATTERY(deviceInfo.batteryLevel)}
			{#if deviceInfo.plugged}⚡ {KIOSK_TEXTS.PLUGGED}{/if}
		</span>
		{#each ipAddresses as ip (ip)}
			<span class="badge badge-outline badge-sm badge-primary">📡 {ip}</span>
		{/each}
	</div>

	{#if deviceInfo.currentPageUrl}
		<div class="flex min-w-0 items-start gap-2 overflow-hidden text-xs">
			<span class="shrink-0 text-base-content/50">{KIOSK_TEXTS.CURRENT_URL}:</span>
			<span class="direction-ltr min-w-0 flex-1 truncate text-primary" dir="ltr"
				>{deviceInfo.currentPageUrl}</span
			>
		</div>
	{/if}
</div>
