import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { SvelteKitPWA, type SvelteKitPWAOptions } from '@vite-pwa/sveltekit';

const pwaManifest: SvelteKitPWAOptions['manifest'] = {
	name: 'ניהול קיוסק',
	short_name: 'קיוסק',
	description: 'ניהול מרחוק של Fully Kiosk Browser',
	theme_color: '#ffffff',
	background_color: '#f2f2f2',
	display: 'standalone',
	orientation: 'portrait',
	lang: 'he',
	dir: 'rtl',
	icons: [
		{ src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
		{ src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
		{ src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
		{ src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
	]
};

const pwaOptions: Partial<SvelteKitPWAOptions> = {
	registerType: 'autoUpdate',
	manifest: pwaManifest,
	workbox: {
		globPatterns: ['client/**/*.{js,css,ico,png,svg,webp,woff,woff2,webmanifest}'],
		cleanupOutdatedCaches: true,
		navigateFallback: '/index.html'
	},
	kit: {
		adapterFallback: 'index.html',
		spa: true
	},
	devOptions: {
		enabled: true
	}
};

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA(pwaOptions),
		devtoolsJson()
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'client',
					browser: {
						enabled: true,
						provider: playwright(),
						instances: [{ browser: 'chromium', headless: true }]
					},
					include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
					exclude: ['src/lib/server/**']
				}
			},

			{
				extends: './vite.config.ts',
				test: {
					name: 'server',
					environment: 'node',
					include: ['src/**/*.{test,spec}.{js,ts}'],
					exclude: ['src/**/*.svelte.{test,spec}.{js,ts}']
				}
			}
		]
	}
});
