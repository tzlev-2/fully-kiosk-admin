<script lang="ts">
	import { resolve } from '$app/paths';

	type DockTab =
		| { label: string; emoji: string; kind: 'screen' | 'devices' }
		| { label: string; emoji: string; kind: 'device' | 'nav'; id: string };

	let {
		tab,
		active = false,
		variant = 'dock',
		class: className = ''
	}: {
		tab: DockTab;
		active?: boolean;
		variant?: 'dock' | 'sidebar';
		class?: string;
	} = $props();
</script>

{#if tab.kind === 'screen'}
	<a
		href={resolve('/screen')}
		class={className}
		class:dock-active={variant === 'dock' && active}
		class:bg-primary={variant === 'sidebar' && active}
		class:text-primary-content={variant === 'sidebar' && active}
		class:hover:bg-base-300={variant === 'sidebar' && !active}
	>
		{#if variant === 'dock'}
			<span class="text-xl leading-none">{tab.emoji}</span>
			<span class="dock-label">{tab.label}</span>
		{:else}
			<span class="text-lg">{tab.emoji}</span>
			{tab.label}
		{/if}
	</a>
{:else if tab.kind === 'devices'}
	<a
		href={resolve('/devices')}
		class={className}
		class:dock-active={variant === 'dock' && active}
		class:bg-primary={variant === 'sidebar' && active}
		class:text-primary-content={variant === 'sidebar' && active}
		class:hover:bg-base-300={variant === 'sidebar' && !active}
	>
		{#if variant === 'dock'}
			<span class="text-xl leading-none">{tab.emoji}</span>
			<span class="dock-label">{tab.label}</span>
		{:else}
			<span class="text-lg">{tab.emoji}</span>
			{tab.label}
		{/if}
	</a>
{:else if tab.kind === 'nav'}
	<a
		href={resolve('/d/[id]/nav', { id: tab.id })}
		class={className}
		class:dock-active={variant === 'dock' && active}
		class:bg-primary={variant === 'sidebar' && active}
		class:text-primary-content={variant === 'sidebar' && active}
		class:hover:bg-base-300={variant === 'sidebar' && !active}
	>
		{#if variant === 'dock'}
			<span class="text-xl leading-none">{tab.emoji}</span>
			<span class="dock-label">{tab.label}</span>
		{:else}
			<span class="text-lg">{tab.emoji}</span>
			{tab.label}
		{/if}
	</a>
{:else if tab.kind === 'device'}
	<a
		href={resolve('/d/[id]', { id: tab.id })}
		class={className}
		class:dock-active={variant === 'dock' && active}
		class:bg-primary={variant === 'sidebar' && active}
		class:text-primary-content={variant === 'sidebar' && active}
		class:hover:bg-base-300={variant === 'sidebar' && !active}
	>
		{#if variant === 'dock'}
			<span class="text-xl leading-none">{tab.emoji}</span>
			<span class="dock-label">{tab.label}</span>
		{:else}
			<span class="text-lg">{tab.emoji}</span>
			{tab.label}
		{/if}
	</a>
{/if}
