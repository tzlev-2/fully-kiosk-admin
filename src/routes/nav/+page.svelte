<script lang="ts">
	import { KIOSK_TEXTS } from '$lib/texts';
	import { ctrl, extractDomain } from '$lib/kioskController.svelte';
	import ActionsPanel from '../_components/ActionsPanel.svelte';

	let newLabel = $state('');
	let newUrl = $state('');
	let newLogoUrl = $state('');

	function handleAddWebsite() {
		if (!newLabel.trim() || !newUrl.trim()) return;
		ctrl.addWebsite(newLabel.trim(), newUrl.trim(), newLogoUrl.trim() || undefined);
		newLabel = '';
		newUrl = '';
		newLogoUrl = '';
	}

	function getLogoUrl(site: { url: string; logoUrl?: string }): string {
		if (site.logoUrl) return site.logoUrl;
		const domain = extractDomain(site.url);
		return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
	}
</script>

<!-- אתרים מועדפים -->
<div class="card bg-base-100/80 shadow-sm border border-base-content/10 backdrop-blur lg:col-span-2">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">🌐 {KIOSK_TEXTS.WEBSITES_SECTION}</h2>

		{#if ctrl.websites.length > 0}
			<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
				{#each ctrl.websites as site, i (site.url + i)}
					<div class="relative group">
						<button
							class="flex flex-col items-center justify-center gap-2 p-3 w-full aspect-square bg-base-200 border border-base-300 rounded-2xl cursor-pointer transition-all hover:bg-primary/10 hover:border-primary/40 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
							onclick={() => ctrl.navigateToUrl(site.url)}
							disabled={ctrl.isLoading}
							title={site.url}
						>
							<img
								class="w-10 h-10 object-contain rounded-lg"
								src={getLogoUrl(site)}
								alt=""
								onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
							/>
							<span class="text-xs font-semibold text-center leading-tight line-clamp-2 w-full">
								{site.label}
							</span>
						</button>
						<button
							class="absolute -top-2 -left-2 btn btn-circle btn-xs btn-error opacity-0 group-hover:opacity-100 transition-opacity shadow"
							onclick={() => ctrl.removeWebsite(i)}
							aria-label="הסר"
						>✕</button>
					</div>
				{/each}
			</div>
		{:else}
			<p class="text-sm text-base-content/40 text-center py-4">עדיין לא הוספת אתרים. הוסף אתר למטה.</p>
		{/if}

		<!-- טופס הוספת אתר -->
		<div class="divider my-0"></div>
		<h3 class="font-semibold text-sm">➕ {KIOSK_TEXTS.ADD_WEBSITE_SECTION}</h3>
		<div class="flex flex-col sm:flex-row gap-2 flex-wrap">
			<input
				type="text"
				class="input input-bordered input-sm flex-1 min-w-36"
				bind:value={newLabel}
				placeholder={KIOSK_TEXTS.WEBSITE_LABEL_PLACEHOLDER}
			/>
			<input
				type="url"
				class="input input-bordered input-sm flex-1 min-w-36"
				bind:value={newUrl}
				placeholder={KIOSK_TEXTS.WEBSITE_URL_PLACEHOLDER}
				dir="ltr"
			/>
			<input
				type="url"
				class="input input-bordered input-sm flex-1 min-w-36"
				bind:value={newLogoUrl}
				placeholder={KIOSK_TEXTS.WEBSITE_LOGO_PLACEHOLDER}
				dir="ltr"
			/>
			<button
				class="btn btn-primary btn-sm"
				onclick={handleAddWebsite}
				disabled={!newLabel.trim() || !newUrl.trim()}
			>
				{KIOSK_TEXTS.ADD_BTN}
			</button>
		</div>
	</div>
</div>

<!-- פעולות ניווט -->
<div class="card bg-base-100/80 shadow-sm border border-base-content/10 backdrop-blur lg:col-span-2">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">⚡ {KIOSK_TEXTS.ACTIONS_SECTION}</h2>
		<ActionsPanel />
	</div>
</div>
