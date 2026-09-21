<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { goto } from '$app/navigation';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import DeviceForm from '$lib/components/DeviceForm.svelte';
	import DeviceContext from './DeviceContext.svelte';

	let { children } = $props();

	const routeId = $derived(page.params.id ?? '');
	const device = $derived(routeId ? kiosk.byRouteId(routeId) : null);

	function onConnected(connected: KioskDevice) {
		goto(resolve('/d/[id]', { id: kiosk.routeId(connected) }), { replaceState: true });
	}
</script>

{#if !device}
	<div class="flex flex-col items-center justify-center gap-4 p-8 text-center" dir="rtl">
		<p class="text-lg font-semibold">{KIOSK_TEXTS.UNKNOWN_DEVICE}</p>
		<a href={resolve('/devices')} class="btn btn-sm btn-primary">{KIOSK_TEXTS.DEVICES_TITLE}</a>
	</div>
{:else if !device.deviceInfo}
	<DeviceForm {device} onSuccess={onConnected} />
{:else}
	<DeviceContext {device}>
		{@render children()}
	</DeviceContext>
{/if}
