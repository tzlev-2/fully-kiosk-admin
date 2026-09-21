<script lang="ts">
	import { getContext } from 'svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';

	const device = getContext<KioskDevice>('kiosk-device');

	function send() {
		void device.navigateToUrl('https://example.test/go');
	}
</script>

<p data-testid="context-key">{device.key}</p>
<button type="button" data-testid="device-command" onclick={send}>פקודה</button>
