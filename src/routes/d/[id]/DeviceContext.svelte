<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';

	let { device, children }: { device: KioskDevice; children: Snippet } = $props();

	// ה-{#key device.key} בלייאוט מבטיח מופע לכל מכשיר
	// svelte-ignore state_referenced_locally
	setContext('kiosk-device', device);
	// svelte-ignore state_referenced_locally
	kiosk.rememberLast(device.key);
</script>

{@render children()}
