<script lang="ts">
	import { KIOSK_TEXTS } from '$lib/texts';

	let {
		label,
		value,
		max = 100,
		testId,
		disabled = false,
		onCommit
	}: {
		label: string;
		value: number;
		max?: number;
		testId: string;
		disabled?: boolean;
		onCommit: (v: number) => Promise<boolean>;
	} = $props();

	let display = $derived(value);

	async function commit(v: number) {
		const clamped = Math.max(0, Math.min(max, v));
		display = clamped;
		const ok = await onCommit(clamped);
		if (!ok) display = value;
	}

	function step(delta: number) {
		void commit(display + delta);
	}

	function onRangeChange(event: Event) {
		const el = event.currentTarget as HTMLInputElement;
		void commit(Number(el.value));
	}
</script>

<label class="flex flex-col gap-1">
	<span class="text-sm font-semibold">{label}</span>
	<div class="flex items-center gap-2">
		<button
			type="button"
			class="btn btn-circle border border-base-300 btn-ghost btn-sm"
			onclick={() => step(-10)}
			disabled={disabled || display === 0}
			data-testid="{testId}-down"
			aria-label="{KIOSK_TEXTS.VOLUME_DOWN} {label}">–</button
		>
		<input
			type="range"
			min="0"
			{max}
			step="1"
			data-testid={testId}
			{disabled}
			bind:value={display}
			onchange={onRangeChange}
		/>
		<button
			type="button"
			class="btn btn-circle border border-base-300 btn-ghost btn-sm"
			onclick={() => step(10)}
			disabled={disabled || display >= max}
			data-testid="{testId}-up"
			aria-label="{KIOSK_TEXTS.VOLUME_UP} {label}">+</button
		>
		<span class="min-w-10 text-center text-sm font-semibold text-base-content/60">{display}%</span>
	</div>
</label>
