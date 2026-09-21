<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';

	let { device, children }: { device: KioskDevice; children: Snippet } = $props();

	setContext('kiosk-device', device);
	kiosk.rememberLast(device.key);
</script>

{@render children()}
