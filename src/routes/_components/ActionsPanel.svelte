<script lang="ts">
	import { ctrl } from '$lib/kioskController.svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import AppDropdown from './AppDropdown.svelte';

	let selectedPackage = $state('');
	let customUrl = $state('');

	function handleLaunchApp() {
		if (!selectedPackage) return;
		ctrl.launchApp(selectedPackage);
		selectedPackage = '';
	}

	function handleLoadUrl() {
		if (!customUrl.trim()) return;
		ctrl.navigateToUrl(customUrl.trim());
		customUrl = '';
	}
</script>

<div class="flex flex-col gap-3">
	<!-- קדמה / רקע -->
	<div class="flex gap-2 flex-wrap">
		<button class="btn btn-neutral btn-sm flex-1" onclick={() => ctrl.toForeground()} disabled={ctrl.isLoading}>
			🟢 {KIOSK_TEXTS.TO_FOREGROUND}
		</button>
		<button class="btn btn-ghost btn-sm flex-1 border border-base-300" onclick={() => ctrl.toBackground()} disabled={ctrl.isLoading}>
			⬛ {KIOSK_TEXTS.TO_BACKGROUND}
		</button>
	</div>

	<!-- כתובת בית -->
	<button class="btn btn-ghost btn-sm border border-base-300 w-full" onclick={() => ctrl.loadStartUrl()} disabled={ctrl.isLoading}>
		🏠 {KIOSK_TEXTS.LOAD_START_URL_BTN}
	</button>

	<!-- פתח URL -->
	<div class="flex flex-col sm:flex-row gap-2">
		<input
			type="url"
			class="input input-bordered input-sm flex-1"
			bind:value={customUrl}
			placeholder={KIOSK_TEXTS.WEBSITE_URL_PLACEHOLDER}
			dir="ltr"
			onkeydown={(e) => e.key === 'Enter' && handleLoadUrl()}
		/>
		<button
			class="btn btn-primary btn-sm"
			onclick={handleLoadUrl}
			disabled={ctrl.isLoading || !customUrl.trim()}
		>
			🌐 {KIOSK_TEXTS.LOAD_CUSTOM_URL_BTN}
		</button>
	</div>

	<!-- הפעל אפליקציה -->
	<div class="flex flex-col gap-2">
		{#if ctrl.recentApps.length > 0}
			<div class="flex items-center gap-2 flex-wrap">
				<span class="text-xs text-base-content/50">{KIOSK_TEXTS.RECENT_APPS}:</span>
				{#each ctrl.recentApps as app (app.package)}
					<button
						class="btn btn-xs btn-ghost border border-base-300 p-0.5 h-auto"
						onclick={() => ctrl.launchApp(app.package)}
						title={app.label}
						disabled={ctrl.isLoading}
					>
						<img src="data:image/png;base64,{app.icon}" alt={app.label} class="w-7 h-7 object-contain rounded" />
					</button>
				{/each}
			</div>
		{/if}

		<div class="flex flex-col sm:flex-row gap-2">
			{#if ctrl.appList.length > 0}
				<AppDropdown apps={ctrl.appList} bind:value={selectedPackage} disabled={ctrl.isLoading} />
			{:else}
				<button class="btn btn-ghost btn-sm border border-base-300 flex-1" onclick={() => ctrl.loadApps()} disabled={ctrl.appsLoading}>
					{#if ctrl.appsLoading}<span class="loading loading-spinner loading-xs"></span>{/if}
					{ctrl.appsLoading ? '' : '📋 ' + KIOSK_TEXTS.LOAD_APPS_BTN}
				</button>
			{/if}
			<button
				class="btn btn-primary btn-sm"
				onclick={handleLaunchApp}
				disabled={ctrl.isLoading || !selectedPackage}
			>
				📱 {KIOSK_TEXTS.LAUNCH_APP_BTN}
			</button>
		</div>
	</div>
</div>
