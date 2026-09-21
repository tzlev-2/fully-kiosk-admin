<script lang="ts">
	import { KIOSK_TEXTS } from '$lib/texts';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { getContext } from 'svelte';
	import ActionsPanel from './ActionsPanel.svelte';
	import { getLogoUrl } from './websites';

	const device = getContext<KioskDevice>('kiosk-device');

	let newLabel = $state('');
	let newUrl = $state('');
	let newLogoUrl = $state('');

	function handleAddWebsite() {
		if (!newLabel.trim() || !newUrl.trim()) return;
		kiosk.addWebsite(newLabel.trim(), newUrl.trim(), newLogoUrl.trim() || undefined);
		newLabel = '';
		newUrl = '';
		newLogoUrl = '';
	}

	async function handleNavigate(url: string) {
		const ok = await device.navigateToUrl(url);
		if (ok) kiosk.showFeedback('success', KIOSK_TEXTS.SUCCESS_NAVIGATED);
		else kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
	}
</script>

<div
	class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur lg:col-span-2"
>
	<div class="card-body gap-4">
		<h2 class="card-title text-base">🌐 {KIOSK_TEXTS.WEBSITES_SECTION}</h2>

		{#if kiosk.websites.length > 0}
			<div class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
				{#each kiosk.websites as site, i (site.url + i)}
					<div class="group relative">
						<button
							class="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-base-300 bg-base-200 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/10 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
							onclick={() => handleNavigate(site.url)}
							disabled={device.isLoading}
							title={site.url}
						>
							<img
								class="h-10 w-10 rounded-lg object-contain"
								src={getLogoUrl(site)}
								alt=""
								onerror={(e) => {
									(e.currentTarget as HTMLImageElement).style.display = 'none';
								}}
							/>
							<span class="line-clamp-2 w-full text-center text-xs leading-tight font-semibold">
								{site.label}
							</span>
						</button>
						<button
							class="btn absolute -top-2 -left-2 btn-circle opacity-0 shadow transition-opacity btn-xs btn-error group-hover:opacity-100"
							onclick={() => kiosk.removeWebsite(i)}
							aria-label={KIOSK_TEXTS.REMOVE_WEBSITE}>✕</button
						>
					</div>
				{/each}
			</div>
		{:else}
			<p class="py-4 text-center text-sm text-base-content/40">{KIOSK_TEXTS.NO_WEBSITES_YET}</p>
		{/if}

		<div class="divider my-0"></div>
		<h3 class="text-sm font-semibold">➕ {KIOSK_TEXTS.ADD_WEBSITE_SECTION}</h3>
		<div class="flex flex-col flex-wrap gap-2 sm:flex-row">
			<input
				type="text"
				class="input-bordered input input-sm min-w-36 flex-1"
				bind:value={newLabel}
				placeholder={KIOSK_TEXTS.WEBSITE_LABEL_PLACEHOLDER}
			/>
			<input
				type="url"
				class="input-bordered input input-sm min-w-36 flex-1"
				bind:value={newUrl}
				placeholder={KIOSK_TEXTS.WEBSITE_URL_PLACEHOLDER}
				dir="ltr"
			/>
			<input
				type="url"
				class="input-bordered input input-sm min-w-36 flex-1"
				bind:value={newLogoUrl}
				placeholder={KIOSK_TEXTS.WEBSITE_LOGO_PLACEHOLDER}
				dir="ltr"
			/>
			<button
				class="btn btn-sm btn-primary"
				onclick={handleAddWebsite}
				disabled={!newLabel.trim() || !newUrl.trim()}
			>
				{KIOSK_TEXTS.ADD_BTN}
			</button>
		</div>
	</div>
</div>

<div
	class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur lg:col-span-2"
>
	<div class="card-body gap-4">
		<h2 class="card-title text-base">⚡ {KIOSK_TEXTS.ACTIONS_SECTION}</h2>
		<ActionsPanel />
	</div>
</div>
