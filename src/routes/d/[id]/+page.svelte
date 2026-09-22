<script lang="ts">
	import { getContext } from 'svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import DeviceInfoPanel from './DeviceInfoPanel.svelte';
	import VolumeCard from './VolumeCard.svelte';

	const device = getContext<KioskDevice>('kiosk-device');

	async function handleRefresh() {
		const ok = await kiosk.refreshDevice(device);
		if (!ok) kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_CONNECTION);
	}

	async function handleToggleKioskMode() {
		if (!device.deviceInfo) return;
		if (device.deviceInfo.kioskMode && !window.confirm(KIOSK_TEXTS.CONFIRM_DISABLE_KIOSK)) return;
		const wasOn = device.deviceInfo.kioskMode;
		const ok = await device.toggleKioskMode();
		if (ok) {
			kiosk.showFeedback(
				'success',
				wasOn ? KIOSK_TEXTS.SUCCESS_KIOSK_MODE_OFF : KIOSK_TEXTS.SUCCESS_KIOSK_MODE_ON
			);
		} else {
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		}
	}

	async function handleToggleKiosk() {
		if (!device.deviceInfo) return;
		const wasLocked = device.deviceInfo.kioskLocked;
		const ok = await device.toggleKiosk();
		if (ok) {
			kiosk.showFeedback(
				'success',
				wasLocked ? KIOSK_TEXTS.SUCCESS_UNLOCKED : KIOSK_TEXTS.SUCCESS_LOCKED
			);
		} else {
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		}
	}

	async function handleToggleMaintenance() {
		if (!device.deviceInfo) return;
		const wasOn = device.deviceInfo.maintenanceMode;
		const ok = await device.toggleMaintenance();
		if (ok) {
			kiosk.showFeedback(
				'success',
				wasOn ? KIOSK_TEXTS.SUCCESS_MAINTENANCE_OFF : KIOSK_TEXTS.SUCCESS_MAINTENANCE_ON
			);
		} else {
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		}
	}

	async function handleToggleScreen() {
		if (!device.deviceInfo) return;
		const wasOn = device.deviceInfo.screenOn;
		const ok = await device.toggleScreen();
		if (ok) {
			kiosk.showFeedback(
				'success',
				wasOn ? KIOSK_TEXTS.SUCCESS_SCREEN_OFF : KIOSK_TEXTS.SUCCESS_SCREEN_ON
			);
		} else {
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		}
	}

	async function handleRestartApp() {
		if (!window.confirm(KIOSK_TEXTS.CONFIRM_RESTART_APP)) return;
		const ok = await device.restartApp();
		if (ok) kiosk.showFeedback('success', KIOSK_TEXTS.SUCCESS_RESTART_APP);
		else kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
	}

	async function handleRebootDevice() {
		if (!window.confirm(KIOSK_TEXTS.CONFIRM_REBOOT_DEVICE)) return;
		const ok = await device.rebootDevice();
		if (ok) kiosk.showFeedback('success', KIOSK_TEXTS.SUCCESS_REBOOT_DEVICE);
		else kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
	}
</script>

<!-- מידע מכשיר -->
<div
	class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur lg:col-span-2"
>
	<div class="card-body gap-4">
		<h2 class="card-title text-base">📱 {KIOSK_TEXTS.DEVICE_INFO_TITLE}</h2>
		<DeviceInfoPanel
			deviceInfo={device.deviceInfo!}
			onRefresh={handleRefresh}
			isRefreshing={device.isConnecting}
		/>
	</div>
</div>

<!-- מצב קיוסק + תחזוקה -->
<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">⚙️ {KIOSK_TEXTS.KIOSK_SECTION}</h2>
		<div class="flex flex-col gap-3">
			<div class="flex items-center gap-3">
				<div class="flex flex-1 flex-col gap-0.5">
					<span class="text-sm font-semibold">🔒 {KIOSK_TEXTS.KIOSK_MODE_LABEL}</span>
					{#if device.deviceInfo?.kioskMode}
						<span class="text-xs text-warning">{KIOSK_TEXTS.KIOSK_MODE_WARNING}</span>
					{/if}
				</div>
				<span class="min-w-8 text-center text-xs text-base-content/50">
					{device.deviceInfo?.kioskMode
						? KIOSK_TEXTS.KIOSK_MODE_ENABLED
						: KIOSK_TEXTS.KIOSK_MODE_DISABLED}
				</span>
				<button
					class="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none bg-base-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&.on]:bg-primary"
					class:on={device.deviceInfo?.kioskMode}
					onclick={handleToggleKioskMode}
					disabled={device.isLoading}
					aria-label={KIOSK_TEXTS.KIOSK_MODE_LABEL}
					aria-pressed={device.deviceInfo?.kioskMode}
					><span
						class="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform [[.on]>&]:-translate-x-5"
					></span></button
				>
			</div>

			<div class="flex items-center gap-3">
				<div class="flex flex-1 flex-col gap-0.5">
					<span class="text-sm font-semibold">🔓 {KIOSK_TEXTS.KIOSK_LOCK_LABEL}</span>
					<span class="text-xs text-base-content/40">{KIOSK_TEXTS.KIOSK_LOCK_HINT}</span>
				</div>
				<span class="min-w-8 text-center text-xs text-base-content/50">
					{device.deviceInfo?.kioskLocked
						? KIOSK_TEXTS.KIOSK_LOCK_LOCKED
						: KIOSK_TEXTS.KIOSK_LOCK_UNLOCKED}
				</span>
				<button
					class="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none bg-base-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&.on]:bg-primary"
					class:on={device.deviceInfo?.kioskLocked}
					onclick={handleToggleKiosk}
					disabled={device.isLoading || !device.deviceInfo?.kioskMode}
					aria-label={KIOSK_TEXTS.KIOSK_LOCK_LABEL}
					aria-pressed={device.deviceInfo?.kioskLocked}
					><span
						class="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform [[.on]>&]:-translate-x-5"
					></span></button
				>
			</div>

			<div class="flex items-center gap-3">
				<span class="flex-1 text-sm font-semibold">🛠️ {KIOSK_TEXTS.MAINTENANCE_LABEL}</span>
				<span class="min-w-8 text-center text-xs text-base-content/50">
					{device.deviceInfo?.maintenanceMode
						? KIOSK_TEXTS.MAINTENANCE_ON_STATE
						: KIOSK_TEXTS.MAINTENANCE_OFF_STATE}
				</span>
				<button
					class="relative h-6 w-11 shrink-0 cursor-pointer rounded-full border-none bg-base-300 transition-colors disabled:cursor-not-allowed disabled:opacity-50 [&.on]:bg-primary"
					class:on={device.deviceInfo?.maintenanceMode}
					onclick={handleToggleMaintenance}
					disabled={device.isLoading}
					aria-label={KIOSK_TEXTS.MAINTENANCE_LABEL}
					aria-pressed={device.deviceInfo?.maintenanceMode}
					><span
						class="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform [[.on]>&]:-translate-x-5"
					></span></button
				>
			</div>
		</div>
	</div>
</div>

<VolumeCard />

<!-- מסך -->
<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">💡 {KIOSK_TEXTS.SCREEN_SECTION}</h2>
		<button
			class="btn w-full btn-outline btn-warning"
			onclick={handleToggleScreen}
			disabled={device.isLoading}
		>
			{device.deviceInfo?.screenOn
				? '🌑 ' + KIOSK_TEXTS.SCREEN_TOGGLE_OFF
				: '💡 ' + KIOSK_TEXTS.SCREEN_TOGGLE_ON}
		</button>
	</div>
</div>

<!-- פעולות קריטיות -->
<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
	<div class="card-body gap-3">
		<h2 class="card-title text-base">♻️ {KIOSK_TEXTS.CRITICAL_ACTIONS}</h2>
		<button
			class="btn w-full btn-outline btn-primary"
			onclick={handleRestartApp}
			disabled={device.isLoading}
		>
			🔄 {KIOSK_TEXTS.RESTART_APP_BTN}
		</button>
		<button class="btn w-full btn-error" onclick={handleRebootDevice} disabled={device.isLoading}>
			⚠️ {KIOSK_TEXTS.REBOOT_DEVICE_BTN}
		</button>
	</div>
</div>
