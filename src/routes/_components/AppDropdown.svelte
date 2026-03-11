<script lang="ts">
	import type { AppListItem } from '$lib/fullyKioskTypes';
	import { KIOSK_TEXTS } from '$lib/texts';

	let { apps, value = $bindable(''), disabled = false }: {
		apps: AppListItem[];
		value: string;
		disabled?: boolean;
	} = $props();

	let open = $state(false);
	let search = $state('');
	const filtered = $derived(
		search.trim()
			? apps.filter(a =>
					a.label.toLowerCase().includes(search.toLowerCase()) ||
					a.package.toLowerCase().includes(search.toLowerCase())
			  )
			: apps
	);

	const selected = $derived(apps.find(a => a.package === value) ?? null);

	function select(pkg: string) {
		value = pkg;
		open = false;
		search = '';
	}

	function toggle() {
		if (disabled) return;
		open = !open;
		if (!open) search = '';
	}
</script>

<div class="dropdown" dir="rtl">
	<button class="trigger" onclick={toggle} {disabled} type="button">
		{#if selected}
			<img src="data:image/png;base64,{selected.icon}" alt="" class="icon" />
			<span class="label">{selected.label}</span>
		{:else}
			<span class="placeholder">{KIOSK_TEXTS.SELECT_APP_PLACEHOLDER}</span>
		{/if}
		<span class="chevron" class:flipped={open}>▼</span>
	</button>

	{#if open}
		<!-- eslint-disable-next-line svelte/valid-compile -->
		<div
			class="backdrop"
			role="presentation"
			onclick={() => { open = false; search = ''; }}
		></div>
		<div class="panel">
			<input
				type="text"
				bind:value={search}
				{@attach (node) => { node.focus(); }}
				placeholder={KIOSK_TEXTS.APP_SEARCH_PLACEHOLDER}
				class="search"
				dir="rtl"
			/>
			<div class="list">
				{#each filtered as app (`${app.package}::${app.label}`)}
					<button
						class="item"
						class:active={app.package === value}
						onclick={() => select(app.package)}
						type="button"
					>
						<img src="data:image/png;base64,{app.icon}" alt="" class="icon" />
						<span>{app.label}</span>
					</button>
				{/each}
				{#if filtered.length === 0}
					<p class="empty">{KIOSK_TEXTS.NO_RESULTS}</p>
				{/if}
			</div>
		</div>
	{/if}
</div>

<style>
	.dropdown {
		position: relative;
		flex: 1;
		min-width: 160px;
	}

	.trigger {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.55rem 0.75rem;
		border: 1px solid #cbd5e1;
		border-radius: 8px;
		background: #f8fafc;
		font-size: 0.9rem;
		font-family: inherit;
		cursor: pointer;
		text-align: right;
		transition: border-color 0.2s;
	}

	.trigger:not(:disabled):hover {
		border-color: #6366f1;
	}

	.trigger:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.label {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.placeholder {
		flex: 1;
		color: #94a3b8;
	}

	.chevron {
		font-size: 0.65rem;
		color: #94a3b8;
		transition: transform 0.15s;
		margin-right: auto;
	}

	.chevron.flipped {
		transform: rotate(180deg);
	}

	.backdrop {
		position: fixed;
		inset: 0;
		z-index: 10;
		background: transparent;
	}

	.panel {
		position: absolute;
		top: calc(100% + 4px);
		right: 0;
		left: 0;
		z-index: 11;
		background: white;
		border: 1px solid #e2e8f0;
		border-radius: 10px;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.search {
		padding: 0.5rem 0.75rem;
		border: none;
		border-bottom: 1px solid #f1f5f9;
		font-size: 0.9rem;
		font-family: inherit;
		outline: none;
		background: #fafafa;
	}

	.list {
		max-height: 220px;
		overflow-y: auto;
	}

	.item {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.75rem;
		border: none;
		background: none;
		font-size: 0.88rem;
		font-family: inherit;
		cursor: pointer;
		text-align: right;
		transition: background 0.1s;
	}

	.item:hover {
		background: #f1f5f9;
	}

	.item.active {
		background: #ede9fe;
		color: #4f46e5;
		font-weight: 600;
	}

	.icon {
		width: 28px;
		height: 28px;
		object-fit: contain;
		border-radius: 6px;
		flex-shrink: 0;
	}

	.empty {
		padding: 0.75rem;
		color: #94a3b8;
		font-size: 0.85rem;
		text-align: center;
		margin: 0;
	}
</style>
