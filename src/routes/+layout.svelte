<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { pwaInfo } from 'virtual:pwa-info';
	import { goto } from '$app/navigation';

	import { KIOSK_TEXTS, CONNECTION_STATUS_TEXT } from '$lib/texts';
	import { ctrl } from '$lib/kioskController.svelte';
	import LoginCard from './_components/LoginCard.svelte';

	const webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : '';

	let { children } = $props();
	let initialized = $state(false);
	let isDark = $state(false);

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
	}

	const tabs = [
		{ label: KIOSK_TEXTS.TAB_DEVICE, emoji: '📟', href: '/device' },
		{ label: KIOSK_TEXTS.TAB_NAV, emoji: '🌐', href: '/nav' },
		{ label: KIOSK_TEXTS.TAB_SCREEN, emoji: '📷', href: '/screen' }
	];

	onMount(async () => {
		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		}

		const params = new URLSearchParams(location.search);
		const fromQr = ctrl.loadFromUrlParam(params);
		if (fromQr) {
			history.replaceState(null, '', location.pathname);
			await ctrl.connect();
		} else {
			ctrl.loadFromStorage();
			if (ctrl.baseUrl) {
				await ctrl.connect();
			}
		}
		initialized = true;
		if (page.url.pathname === '/') {
			await goto('/device', { replaceState: true });
		}
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
	{@html webManifest}
	<meta name="theme-color" content="#ffffff" />
	<title>{KIOSK_TEXTS.PAGE_TITLE}</title>
	<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;700;900&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

{#if !initialized}
	<div class="flex min-h-screen flex-col items-center justify-center gap-4 bg-base-200">
		<span class="loading loading-lg loading-spinner text-primary"></span>
		{#if CONNECTION_STATUS_TEXT[ctrl.connectionStatus]}
			<p
				class="text-sm text-base-content/60"
				class:text-error={ctrl.connectionStatus.startsWith('error')}
				class:font-semibold={ctrl.connectionStatus.startsWith('error')}
			>
				{CONNECTION_STATUS_TEXT[ctrl.connectionStatus]}
			</p>
		{/if}
	</div>
{:else if !ctrl.deviceInfo}
	<LoginCard onConnect={() => ctrl.connect()} />
{:else}
	<div class="drawer drawer-end lg:drawer-open">
		<input id="nav-drawer" type="checkbox" class="drawer-toggle" />

		<div class="drawer-content flex h-dvh flex-col bg-base-300">
			<nav
				class="navbar min-h-14 shrink-0 gap-2 border-b border-base-content/10 bg-base-200 px-3"
				dir="rtl"
			>
				<span class="flex-1 truncate text-base font-black">🖥️ {KIOSK_TEXTS.PAGE_TITLE}</span>
				<button
					class="btn btn-circle btn-ghost btn-sm"
					onclick={toggleTheme}
					title="החלף ערכת נושא"
				>
					{#if isDark}
						<!-- שמש — עבור מצב כהה, לחיצה חוזרת לבהיר -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 7a5 5 0 100 10A5 5 0 0012 7z"
							/>
						</svg>
					{:else}
						<!-- ירח — עבור מצב בהיר, לחיצה עוברת לכהה -->
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-5 w-5"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
							/>
						</svg>
					{/if}
				</button>
				<button
					class="btn btn-outline btn-sm btn-error lg:hidden"
					onclick={() => ctrl.disconnect()}
				>
					{KIOSK_TEXTS.DISCONNECT}
				</button>
			</nav>

			{#if ctrl.feedback}
				<div
					class="fixed bottom-24 left-1/2 z-50 alert w-auto max-w-xs -translate-x-1/2 animate-fade-in-up text-sm font-semibold shadow-lg lg:bottom-6"
					class:alert-success={ctrl.feedback.type === 'success'}
					class:alert-error={ctrl.feedback.type === 'error'}
					role="alert"
				>
					{ctrl.feedback.message}
				</div>
			{/if}

			<main
				class="flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:pb-5"
				dir="rtl"
			>
				{@render children()}
			</main>

			<div class="dock lg:hidden" dir="rtl">
				{#each tabs as tab (tab.href)}
					<a href={tab.href} class:dock-active={page.url.pathname === tab.href}>
						<span class="text-xl leading-none">{tab.emoji}</span>
						<span class="dock-label">{tab.label}</span>
					</a>
				{/each}
			</div>
		</div>

		<div class="drawer-side z-40">
			<label for="nav-drawer" class="drawer-overlay"></label>
			<aside
				class="flex min-h-full w-52 flex-col border-r border-base-content/10 bg-base-200"
				dir="rtl"
			>
				<div class="border-b border-base-content/10 p-4">
					<p class="text-sm font-black">🖥️ {KIOSK_TEXTS.PAGE_TITLE}</p>
					<p class="mt-0.5 truncate text-xs text-base-content/50">{ctrl.deviceInfo.deviceName}</p>
				</div>
				<nav class="flex flex-1 flex-col gap-1 p-3">
					{#each tabs as tab (tab.href)}
						<a
							href={tab.href}
							class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
							class:bg-primary={page.url.pathname === tab.href}
							class:text-primary-content={page.url.pathname === tab.href}
							class:hover:bg-base-300={page.url.pathname !== tab.href}
						>
							<span class="text-lg">{tab.emoji}</span>
							{tab.label}
						</a>
					{/each}
				</nav>
				<div class="border-t border-base-content/10 p-3">
					<button class="btn w-full btn-outline btn-sm btn-error" onclick={() => ctrl.disconnect()}>
						{KIOSK_TEXTS.DISCONNECT}
					</button>
				</div>
			</aside>
		</div>
	</div>
{/if}
