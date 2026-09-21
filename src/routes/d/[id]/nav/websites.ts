import { extractDomain } from '$lib/kiosk-store.svelte';

export function getLogoUrl(site: { url: string; logoUrl?: string }): string {
	if (site.logoUrl) return site.logoUrl;
	const domain = extractDomain(site.url);
	return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}
