<script lang="ts">
	import type { DeviceInfoResponse } from '$lib/fullyKioskTypes';
	import { KIOSK_TEXTS } from '$lib/texts';

	let { deviceInfo, onRefresh, isRefreshing }: {
		deviceInfo: DeviceInfoResponse;
		onRefresh: () => void;
		isRefreshing: boolean;
	} = $props();
</script>

<div class="bg-info/10 border border-info/20 rounded-xl p-4 flex flex-col gap-3">
	<div class="flex items-center justify-between min-w-0">
		<span class="font-bold text-base truncate flex-1 min-w-0">{deviceInfo.deviceName}</span>
		<div class="flex items-center gap-2 shrink-0 mr-2">
			<span class="text-xs text-base-content/50">v{deviceInfo.version}</span>
			<button
				class="btn btn-ghost btn-xs btn-square"
				onclick={onRefresh}
				disabled={isRefreshing}
				title={KIOSK_TEXTS.REFRESH}
			>
				{#if isRefreshing}
					<span class="loading loading-spinner loading-xs"></span>
				{:else}
					🔄
				{/if}
			</button>
		</div>
	</div>

	<div class="flex flex-wrap gap-1.5">
		<span class="badge badge-sm" class:badge-warning={deviceInfo.kioskLocked} class:badge-success={!deviceInfo.kioskLocked}>
			{deviceInfo.kioskLocked ? '🔒 ' + KIOSK_TEXTS.KIOSK_STATUS_LOCKED : '🔓 ' + KIOSK_TEXTS.KIOSK_STATUS_UNLOCKED}
		</span>
		<span class="badge badge-sm" class:badge-info={deviceInfo.screenOn} class:badge-ghost={!deviceInfo.screenOn}>
			{deviceInfo.screenOn ? '💡 ' + KIOSK_TEXTS.SCREEN_ON : '🌑 ' + KIOSK_TEXTS.SCREEN_OFF}
		</span>
		<span class="badge badge-sm badge-success badge-outline">
			🔋 {KIOSK_TEXTS.BATTERY(deviceInfo.batteryLevel)}
			{#if deviceInfo.plugged}⚡ {KIOSK_TEXTS.PLUGGED}{/if}
		</span>
		{#if deviceInfo.ip4}
			<span class="badge badge-sm badge-primary badge-outline">📡 {deviceInfo.ip4}</span>
		{/if}
	</div>

	{#if deviceInfo.currentPageUrl}
		<div class="flex gap-2 text-xs items-start overflow-hidden min-w-0">
			<span class="text-base-content/50 shrink-0">{KIOSK_TEXTS.CURRENT_URL}:</span>
			<span class="text-primary truncate flex-1 min-w-0 direction-ltr" dir="ltr">{deviceInfo.currentPageUrl}</span>
		</div>
	{/if}
</div>
