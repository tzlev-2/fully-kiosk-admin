<script lang="ts">
	import { KIOSK_TEXTS } from '$lib/texts';
	import { ctrl } from '$lib/kioskController.svelte';
	import DeviceInfoPanel from '../_components/DeviceInfoPanel.svelte';
</script>

<!-- מידע מכשיר -->
<div class="card bg-base-100 shadow-sm">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">📱 {KIOSK_TEXTS.DEVICE_INFO_TITLE}</h2>
		<DeviceInfoPanel
			deviceInfo={ctrl.deviceInfo!}
			onRefresh={() => ctrl.refresh()}
			isRefreshing={ctrl.isConnecting}
		/>
	</div>
</div>

<!-- מצב קיוסק + תחזוקה -->
<div class="card bg-base-100 shadow-sm">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">⚙️ {KIOSK_TEXTS.KIOSK_SECTION}</h2>
		<div class="flex flex-col gap-3">

			<!-- מצב קיוסק -->
			<div class="flex items-center gap-3">
				<div class="flex-1 flex flex-col gap-0.5">
					<span class="font-semibold text-sm">🔒 {KIOSK_TEXTS.KIOSK_MODE_LABEL}</span>
					{#if ctrl.deviceInfo?.kioskMode}
						<span class="text-xs text-warning">{KIOSK_TEXTS.KIOSK_MODE_WARNING}</span>
					{/if}
				</div>
				<span class="text-xs text-base-content/50 min-w-8 text-center">
					{ctrl.deviceInfo?.kioskMode ? KIOSK_TEXTS.KIOSK_MODE_ENABLED : KIOSK_TEXTS.KIOSK_MODE_DISABLED}
				</span>
				<button
					class="relative w-11 h-6 rounded-full border-none bg-base-300 cursor-pointer transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed [&.on]:bg-primary"
					class:on={ctrl.deviceInfo?.kioskMode}
					onclick={() => ctrl.toggleKioskMode()}
					disabled={ctrl.isLoading}
					aria-label={KIOSK_TEXTS.KIOSK_MODE_LABEL}
					aria-pressed={ctrl.deviceInfo?.kioskMode}
				><span class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform [[.on]>&]:-translate-x-5"></span></button>
			</div>

			<!-- נעילה זמנית -->
			<div class="flex items-center gap-3">
				<div class="flex-1 flex flex-col gap-0.5">
					<span class="font-semibold text-sm">🔓 {KIOSK_TEXTS.KIOSK_LOCK_LABEL}</span>
					<span class="text-xs text-base-content/40">{KIOSK_TEXTS.KIOSK_LOCK_HINT}</span>
				</div>
				<span class="text-xs text-base-content/50 min-w-8 text-center">
					{ctrl.deviceInfo?.kioskLocked ? KIOSK_TEXTS.KIOSK_LOCK_LOCKED : KIOSK_TEXTS.KIOSK_LOCK_UNLOCKED}
				</span>
				<button
					class="relative w-11 h-6 rounded-full border-none bg-base-300 cursor-pointer transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed [&.on]:bg-primary"
					class:on={ctrl.deviceInfo?.kioskLocked}
					onclick={() => ctrl.toggleKiosk()}
					disabled={ctrl.isLoading || !ctrl.deviceInfo?.kioskMode}
					aria-label={KIOSK_TEXTS.KIOSK_LOCK_LABEL}
					aria-pressed={ctrl.deviceInfo?.kioskLocked}
				><span class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform [[.on]>&]:-translate-x-5"></span></button>
			</div>

			<!-- תחזוקה -->
			<div class="flex items-center gap-3">
				<span class="font-semibold text-sm flex-1">🛠️ {KIOSK_TEXTS.MAINTENANCE_LABEL}</span>
				<span class="text-xs text-base-content/50 min-w-8 text-center">
					{ctrl.deviceInfo?.maintenanceMode ? KIOSK_TEXTS.MAINTENANCE_ON_STATE : KIOSK_TEXTS.MAINTENANCE_OFF_STATE}
				</span>
				<button
					class="relative w-11 h-6 rounded-full border-none bg-base-300 cursor-pointer transition-colors shrink-0 disabled:opacity-50 disabled:cursor-not-allowed [&.on]:bg-primary"
					class:on={ctrl.deviceInfo?.maintenanceMode}
					onclick={() => ctrl.toggleMaintenance()}
					disabled={ctrl.isLoading}
					aria-label={KIOSK_TEXTS.MAINTENANCE_LABEL}
					aria-pressed={ctrl.deviceInfo?.maintenanceMode}
				><span class="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform [[.on]>&]:-translate-x-5"></span></button>
			</div>
		</div>
	</div>
</div>

<!-- שמע ומסך -->
<div class="card bg-base-100 shadow-sm">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">🔊 {KIOSK_TEXTS.VOLUME_LABEL}</h2>

		<progress
			class="progress progress-primary w-full"
			value={ctrl.isMuted ? 0 : ctrl.volumeLevel}
			max="100"
		></progress>

		<div class="flex items-center gap-2">
			<button
				class="btn btn-circle btn-sm btn-ghost border border-base-300"
				onclick={() => ctrl.volumeDown()}
				disabled={ctrl.volumeLevel === 0 || ctrl.isMuted}
				aria-label={KIOSK_TEXTS.VOLUME_DOWN}
			>–</button>
			<button
				class="btn btn-circle btn-sm"
				class:btn-error={ctrl.isMuted}
				class:btn-ghost={!ctrl.isMuted}
				onclick={() => ctrl.toggleMute()}
				aria-label={ctrl.isMuted ? KIOSK_TEXTS.VOLUME_UNMUTE : KIOSK_TEXTS.VOLUME_MUTE}
			>{ctrl.isMuted ? '🔇' : '🔊'}</button>
			<button
				class="btn btn-circle btn-sm btn-ghost border border-base-300"
				onclick={() => ctrl.volumeUp()}
				disabled={ctrl.volumeLevel >= 100}
				aria-label={KIOSK_TEXTS.VOLUME_UP}
			>+</button>
			<span class="text-sm text-base-content/60 font-semibold min-w-10 text-center">
				{ctrl.isMuted ? 0 : ctrl.volumeLevel}%
			</span>
		</div>

		<button
			class="btn btn-warning btn-outline w-full"
			onclick={() => ctrl.toggleScreen()}
			disabled={ctrl.isLoading}
		>
			{ctrl.deviceInfo?.screenOn ? '🌑 ' + KIOSK_TEXTS.SCREEN_TOGGLE_OFF : '💡 ' + KIOSK_TEXTS.SCREEN_TOGGLE_ON}
		</button>
	</div>
</div>

<!-- פעולות קריטיות -->
<div class="card bg-base-100 shadow-sm">
	<div class="card-body gap-3">
		<h2 class="card-title text-base">♻️ פעולות קריטיות</h2>
		<button
			class="btn btn-primary btn-outline w-full"
			onclick={() => ctrl.restartApp()}
			disabled={ctrl.isLoading}
		>
			🔄 {KIOSK_TEXTS.RESTART_APP_BTN}
		</button>
		<button
			class="btn btn-error w-full"
			onclick={() => ctrl.rebootDevice()}
			disabled={ctrl.isLoading}
		>
			⚠️ {KIOSK_TEXTS.REBOOT_DEVICE_BTN}
		</button>
	</div>
</div>
