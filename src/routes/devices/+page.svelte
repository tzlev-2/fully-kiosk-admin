<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import DeviceForm from '$lib/components/DeviceForm.svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import BulkActions from './BulkActions.svelte';
	import DeviceCard from './DeviceCard.svelte';

	async function onDeviceAdded(device: KioskDevice) {
		await goto(resolve('/d/[id]', { id: kiosk.routeId(device) }), { replaceState: true });
	}
</script>

<div class="flex flex-col gap-6 lg:col-span-2" dir="rtl">
	<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
		<div class="card-body gap-4">
			<h2 class="card-title text-base">📋 {KIOSK_TEXTS.DEVICES_TITLE}</h2>

			{#if kiosk.devices.length === 0}
				<p class="text-sm text-base-content/60">{KIOSK_TEXTS.NO_DEVICES}</p>
			{:else}
				<div class="flex flex-col gap-4">
					{#each kiosk.devices as device (device.key)}
						<DeviceCard {device} />
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if kiosk.devices.length > 0}
		<BulkActions />
	{/if}

	<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
		<div class="card-body gap-2">
			<h3 class="text-sm font-semibold">➕ {KIOSK_TEXTS.ADD_DEVICE}</h3>
			<DeviceForm onSuccess={onDeviceAdded} />
		</div>
	</div>
</div>
