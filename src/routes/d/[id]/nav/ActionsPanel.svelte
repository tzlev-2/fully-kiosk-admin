<script lang="ts">
	import { getContext } from 'svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import AppDropdown from './AppDropdown.svelte';

	const device = getContext<KioskDevice>('kiosk-device');

	let selectedPackage = $state('');
	let customUrl = $state('');

	async function handleLaunchApp() {
		if (!selectedPackage) return;
		const ok = await device.launchApp(selectedPackage);
		if (ok) kiosk.showFeedback('success', KIOSK_TEXTS.SUCCESS_APP_LAUNCHED);
		else kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		selectedPackage = '';
	}

	async function handleLoadUrl() {
		if (!customUrl.trim()) return;
		const ok = await device.navigateToUrl(customUrl.trim());
		if (ok) kiosk.showFeedback('success', KIOSK_TEXTS.SUCCESS_NAVIGATED);
		else kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		customUrl = '';
	}

	async function runAction(
		fn: () => Promise<boolean>,
		success: string,
		error = KIOSK_TEXTS.ERROR_COMMAND
	) {
		const ok = await fn();
		if (ok) kiosk.showFeedback('success', success);
		else kiosk.showFeedback('error', error);
	}
</script>

<div class="flex flex-col gap-3">
	<div class="flex flex-wrap gap-2">
		<button
			class="btn flex-1 btn-sm btn-neutral"
			onclick={() => runAction(() => device.toForeground(), KIOSK_TEXTS.SUCCESS_FOREGROUND)}
			disabled={device.isLoading}
		>
			🟢 {KIOSK_TEXTS.TO_FOREGROUND}
		</button>
		<button
			class="btn flex-1 border border-base-300 btn-ghost btn-sm"
			onclick={() => runAction(() => device.toBackground(), KIOSK_TEXTS.SUCCESS_BACKGROUND)}
			disabled={device.isLoading}
		>
			⬛ {KIOSK_TEXTS.TO_BACKGROUND}
		</button>
	</div>

	<button
		class="btn w-full border border-base-300 btn-ghost btn-sm"
		onclick={() => runAction(() => device.loadStartUrl(), KIOSK_TEXTS.SUCCESS_START_URL)}
		disabled={device.isLoading}
	>
		🏠 {KIOSK_TEXTS.LOAD_START_URL_BTN}
	</button>

	<div class="flex flex-col gap-2 sm:flex-row">
		<input
			type="url"
			class="input-bordered input input-sm flex-1"
			bind:value={customUrl}
			placeholder={KIOSK_TEXTS.WEBSITE_URL_PLACEHOLDER}
			dir="ltr"
			onkeydown={(e) => e.key === 'Enter' && handleLoadUrl()}
		/>
		<button
			class="btn btn-sm btn-primary"
			onclick={handleLoadUrl}
			disabled={device.isLoading || !customUrl.trim()}
		>
			🌐 {KIOSK_TEXTS.LOAD_CUSTOM_URL_BTN}
		</button>
	</div>

	<div class="flex flex-col gap-2">
		{#if device.recentApps.length > 0}
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-xs text-base-content/50">{KIOSK_TEXTS.RECENT_APPS}:</span>
				{#each device.recentApps as app (app.package)}
					<button
						class="btn h-auto border border-base-300 p-0.5 btn-ghost btn-xs"
						onclick={async () => {
							const ok = await device.launchApp(app.package);
							if (ok) kiosk.showFeedback('success', KIOSK_TEXTS.SUCCESS_APP_LAUNCHED);
							else kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
						}}
						title={app.label}
						disabled={device.isLoading}
					>
						<img
							src="data:image/png;base64,{app.icon}"
							alt={app.label}
							class="h-7 w-7 rounded object-contain"
						/>
					</button>
				{/each}
			</div>
		{/if}

		<div class="flex flex-col gap-2 sm:flex-row">
			{#if device.appList.length > 0}
				<AppDropdown
					apps={device.appList}
					bind:value={selectedPackage}
					disabled={device.isLoading}
				/>
			{:else}
				<button
					class="btn flex-1 border border-base-300 btn-ghost btn-sm"
					onclick={() => device.loadApps()}
					disabled={device.appsLoading}
				>
					{#if device.appsLoading}<span class="loading loading-xs loading-spinner"></span>{/if}
					{device.appsLoading ? '' : '📋 ' + KIOSK_TEXTS.LOAD_APPS_BTN}
				</button>
			{/if}
			<button
				class="btn btn-sm btn-primary"
				onclick={handleLaunchApp}
				disabled={device.isLoading || !selectedPackage}
			>
				📱 {KIOSK_TEXTS.LAUNCH_APP_BTN}
			</button>
		</div>
	</div>
</div>
