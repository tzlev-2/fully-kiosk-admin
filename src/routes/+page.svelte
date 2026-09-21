<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { onMount } from 'svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';

	onMount(() => {
		const last =
			(kiosk.lastDeviceKey && kiosk.devices.find((d) => d.key === kiosk.lastDeviceKey)) ||
			kiosk.devices[0];
		if (last) {
			goto(resolve('/d/[id]', { id: kiosk.routeId(last) }), { replaceState: true });
		} else {
			goto(resolve('/devices'), { replaceState: true });
		}
	});
</script>
