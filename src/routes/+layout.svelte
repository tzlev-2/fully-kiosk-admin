<script lang="ts">
	import './layout.css';
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { pwaInfo } from 'virtual:pwa-info';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';

	import { KIOSK_TEXTS } from '$lib/texts';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import DeviceSwitcher from '$lib/components/DeviceSwitcher.svelte';
	import DockTabLink from '$lib/components/DockTabLink.svelte';

	const webManifest = pwaInfo ? pwaInfo.webManifest.linkTag : '';

	let { children } = $props();
	let initialized = $state(false);
	let isDark = $state(false);

	function toggleTheme() {
		isDark = !isDark;
		document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
	}

	const sidebarDevice = $derived.by(() => {
		const match = page.url.pathname.match(/\/d\/([^/]+)/);
		if (match) return kiosk.byRouteId(match[1]);
		if (kiosk.lastDeviceKey) {
			return kiosk.devices.find((d) => d.key === kiosk.lastDeviceKey) ?? null;
		}
		return kiosk.devices[0] ?? null;
	});

	type DockTab =
		| { label: string; emoji: string; kind: 'screen' | 'devices' }
		| { label: string; emoji: string; kind: 'device' | 'nav'; id: string };

	const dockTabs = $derived.by((): DockTab[] => {
		const id = sidebarDevice ? kiosk.routeId(sidebarDevice) : null;
		if (!id) {
			return [
				{ label: KIOSK_TEXTS.TAB_SCREEN, emoji: '📷', kind: 'screen' },
				{ label: KIOSK_TEXTS.TAB_DEVICES, emoji: '📋', kind: 'devices' }
			];
		}
		return [
			{ label: KIOSK_TEXTS.TAB_DEVICE, emoji: '📟', kind: 'device', id },
			{ label: KIOSK_TEXTS.TAB_NAV, emoji: '🌐', kind: 'nav', id },
			{ label: KIOSK_TEXTS.TAB_SCREEN, emoji: '📷', kind: 'screen' },
			{ label: KIOSK_TEXTS.TAB_DEVICES, emoji: '📋', kind: 'devices' }
		];
	});

	function tabHref(tab: DockTab): string {
		switch (tab.kind) {
			case 'screen':
				return resolve('/screen');
			case 'devices':
				return resolve('/devices');
			case 'nav':
				return resolve('/d/[id]/nav', { id: tab.id });
			case 'device':
				return resolve('/d/[id]', { id: tab.id });
		}
	}

	function isTabActive(tab: DockTab, pathname: string): boolean {
		const href = tabHref(tab);
		if (tab.kind === 'devices') return pathname === resolve('/devices');
		if (tab.kind === 'screen') {
			return pathname === resolve('/screen') || pathname.endsWith('/screen');
		}
		if (tab.kind === 'nav') return pathname.endsWith('/nav');
		return pathname === href || pathname === `${href}/`;
	}

	onMount(async () => {
		if (pwaInfo) {
			const { registerSW } = await import('virtual:pwa-register');
			registerSW({ immediate: true });
		}

		kiosk.load();

		const params = new URLSearchParams(location.search);
		const adopted = kiosk.adoptFromQr(params);
		if (adopted) {
			history.replaceState(null, '', location.pathname);
			kiosk.rememberLast(adopted.key);
			const survivor = await kiosk.connectDevice(adopted);
			await goto(resolve('/d/[id]', { id: kiosk.routeId(survivor) }), { replaceState: true });
			void kiosk.connectAll();
		} else {
			void kiosk.connectAll();
		}

		initialized = true;

		const path = page.url.pathname;
		if (path === '/' || path === resolve('/')) {
			const last =
				(kiosk.lastDeviceKey && kiosk.devices.find((d) => d.key === kiosk.lastDeviceKey)) ||
				kiosk.devices[0];
			if (last) {
				await goto(resolve('/d/[id]', { id: kiosk.routeId(last) }), { replaceState: true });
			} else {
				await goto(resolve('/devices'), { replaceState: true });
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href="/favicon.ico" sizes="any" />
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
	<link rel="apple-touch-icon" href="/apple-touch-icon-180x180.png" />
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
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
	</div>
{:else}
	<div class="drawer drawer-end lg:drawer-open">
		<input id="nav-drawer" type="checkbox" class="drawer-toggle" />

		<div class="drawer-content flex h-dvh flex-col bg-base-300">
			<nav
				class="navbar min-h-14 shrink-0 gap-2 border-b border-base-content/10 bg-base-200 px-3"
				dir="rtl"
			>
				<span class="flex-1 truncate text-base font-black">🖥️ {KIOSK_TEXTS.PAGE_TITLE}</span>
				<DeviceSwitcher />
				<button
					class="btn btn-circle btn-ghost btn-sm"
					onclick={toggleTheme}
					title={KIOSK_TEXTS.THEME_TOGGLE}
				>
					{#if isDark}
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
				{#if sidebarDevice}
					<button
						class="btn btn-outline btn-sm btn-error lg:hidden"
						onclick={() => sidebarDevice.disconnect()}
					>
						{KIOSK_TEXTS.DISCONNECT}
					</button>
				{/if}
			</nav>

			{#if kiosk.feedback}
				<div
					class="fixed bottom-24 left-1/2 z-50 alert w-auto max-w-xs -translate-x-1/2 animate-fade-in-up text-sm font-semibold shadow-lg lg:bottom-6"
					class:alert-success={kiosk.feedback.type === 'success'}
					class:alert-error={kiosk.feedback.type === 'error'}
					role="alert"
				>
					{kiosk.feedback.message}
				</div>
			{/if}

			<main
				class="flex flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-4 pb-24 lg:grid lg:grid-cols-2 lg:items-start lg:pb-5"
				dir="rtl"
			>
				{@render children()}
			</main>

			<div class="dock lg:hidden" dir="rtl">
				{#each dockTabs as tab (tab.kind + ('id' in tab ? tab.id : ''))}
					<DockTabLink {tab} active={isTabActive(tab, page.url.pathname)} />
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
					<p class="mt-0.5 truncate text-xs text-base-content/50">
						{sidebarDevice?.name ?? KIOSK_TEXTS.NO_DEVICES}
					</p>
				</div>
				<div class="border-b border-base-content/10 p-3">
					<DeviceSwitcher />
				</div>
				<nav class="flex flex-1 flex-col gap-1 p-3">
					{#each dockTabs as tab (tab.kind + ('id' in tab ? tab.id : ''))}
						<DockTabLink
							{tab}
							variant="sidebar"
							active={isTabActive(tab, page.url.pathname)}
							class="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors"
						/>
					{/each}
				</nav>
				{#if sidebarDevice}
					<div class="border-t border-base-content/10 p-3">
						<button
							class="btn w-full btn-outline btn-sm btn-error"
							onclick={() => sidebarDevice.disconnect()}
						>
							{KIOSK_TEXTS.DISCONNECT}
						</button>
					</div>
				{/if}
			</aside>
		</div>
	</div>
{/if}
