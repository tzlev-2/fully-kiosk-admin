<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	/* redirect ל-/device כאשר המשתמש ניגש לשורש */
	onMount(() => goto('/device', { replaceState: true }));
</script>
