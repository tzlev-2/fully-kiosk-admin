<script lang="ts">
	import { KIOSK_TEXTS } from '$lib/texts';
	import ScreenTab from '../_components/ScreenTab.svelte';
</script>

<div class="card bg-base-100 shadow-sm">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">📷 {KIOSK_TEXTS.TAB_SCREEN}</h2>
		<ScreenTab />
	</div>
</div>
