<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';

	function switchDevice(device: KioskDevice) {
		const id = kiosk.routeId(device);
		const pathname = page.url.pathname;
		const deviceBase = resolve('/d/[id]', { id });
		if (pathname.startsWith(deviceBase + '/nav')) {
			goto(resolve('/d/[id]/nav', { id }), { replaceState: true });
		} else if (pathname.startsWith(deviceBase + '/screen')) {
			goto(resolve('/d/[id]/screen', { id }), { replaceState: true });
		} else if (pathname.startsWith('/d/')) {
			goto(resolve('/d/[id]', { id }), { replaceState: true });
		} else {
			goto(resolve('/d/[id]', { id }), { replaceState: true });
		}
	}

	const currentRouteId = $derived.by(() => {
		const match = page.url.pathname.match(/\/d\/([^/]+)/);
		return match?.[1] ?? null;
	});
</script>

{#if kiosk.devices.length > 1}
	<select
		class="select-bordered select max-w-48 truncate select-sm"
		dir="rtl"
		value={currentRouteId ?? ''}
		onchange={(e) => {
			const id = (e.currentTarget as HTMLSelectElement).value;
			const device = kiosk.byRouteId(id);
			if (device) switchDevice(device);
		}}
	>
		{#each kiosk.devices as device (device.key)}
			<option value={kiosk.routeId(device)}>{device.name}</option>
		{/each}
	</select>
{/if}
