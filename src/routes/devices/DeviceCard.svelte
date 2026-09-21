<script lang="ts">
	import { resolve } from '$app/paths';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import { CONNECTION_STATUS_TEXT, KIOSK_TEXTS } from '$lib/texts';
	import { splitIp4 } from '../d/[id]/ip4';

	let { device }: { device: KioskDevice } = $props();

	let reconnecting = $state(false);

	const routeId = $derived(kiosk.routeId(device));
	const statusText = $derived(CONNECTION_STATUS_TEXT[device.connectionStatus]);
	const ipAddresses = $derived(device.deviceInfo?.ip4 ? splitIp4(device.deviceInfo.ip4) : []);

	function saveName() {
		const trimmed = device.name.trim();
		if (!trimmed) return;
		kiosk.renameDevice(device.key, trimmed);
	}

	function deleteDevice() {
		if (!window.confirm(KIOSK_TEXTS.CONFIRM_DELETE_DEVICE)) return;
		kiosk.removeDevice(device.key);
	}

	async function reconnect() {
		reconnecting = true;
		try {
			await kiosk.connectDevice(device);
		} finally {
			reconnecting = false;
		}
	}
</script>

<div class="rounded-xl border border-base-content/10 bg-base-200/60 p-4">
	<div class="flex flex-wrap items-start justify-between gap-3">
		<div class="min-w-0 flex-1">
			<a class="link text-lg font-bold link-hover" href={resolve('/d/[id]', { id: routeId })}>
				{device.name}
			</a>
			{#if statusText}
				<p class="mt-1 text-sm text-base-content/60">{statusText}</p>
			{/if}
		</div>
		<button
			class="btn btn-outline btn-sm"
			onclick={reconnect}
			disabled={reconnecting || device.isConnecting}
		>
			{#if reconnecting || device.isConnecting}
				<span class="loading loading-xs loading-spinner"></span>
			{/if}
			{KIOSK_TEXTS.RECONNECT}
		</button>
	</div>

	{#if device.deviceInfo}
		<div class="mt-3 flex flex-wrap gap-1.5">
			<span
				class="badge badge-sm"
				class:badge-warning={device.deviceInfo.kioskLocked}
				class:badge-success={!device.deviceInfo.kioskLocked}
			>
				{device.deviceInfo.kioskLocked
					? '🔒 ' + KIOSK_TEXTS.KIOSK_STATUS_LOCKED
					: '🔓 ' + KIOSK_TEXTS.KIOSK_STATUS_UNLOCKED}
			</span>
			<span
				class="badge badge-sm"
				class:badge-info={device.deviceInfo.screenOn}
				class:badge-ghost={!device.deviceInfo.screenOn}
			>
				{device.deviceInfo.screenOn
					? '💡 ' + KIOSK_TEXTS.SCREEN_ON
					: '🌑 ' + KIOSK_TEXTS.SCREEN_OFF}
			</span>
			<span class="badge badge-outline badge-sm badge-success">
				🔋 {KIOSK_TEXTS.BATTERY(device.deviceInfo.batteryLevel)}
				{#if device.deviceInfo.plugged}⚡ {KIOSK_TEXTS.PLUGGED}{/if}
			</span>
			{#each ipAddresses as ip (ip)}
				<span class="badge badge-outline badge-sm badge-primary">📡 {ip}</span>
			{/each}
		</div>
	{/if}

	<div class="mt-4 flex flex-wrap items-end gap-2">
		<label class="form-control min-w-[12rem] flex-1">
			<span class="label-text text-xs">{KIOSK_TEXTS.DEVICE_NAME_LABEL}</span>
			<input
				class="input-bordered input input-sm w-full"
				bind:value={device.name}
				onchange={saveName}
			/>
		</label>
		<button class="btn btn-sm btn-error" onclick={deleteDevice}>
			{KIOSK_TEXTS.REMOVE_WEBSITE}
		</button>
	</div>
</div>
