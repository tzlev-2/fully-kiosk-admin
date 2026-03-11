<script lang="ts">
	import { page } from '$app/state';
	import { base } from '$app/paths';
	import { KIOSK_TEXTS } from '$lib/texts';

	const is404 = $derived(page.status === 404);
	const title = $derived(is404 ? KIOSK_TEXTS.ERROR_PAGE_TITLE : KIOSK_TEXTS.ERROR_GENERIC_TITLE);
	const description = $derived(
		is404 ? KIOSK_TEXTS.ERROR_PAGE_DESCRIPTION : KIOSK_TEXTS.ERROR_GENERIC_DESCRIPTION
	);
</script>

<div class="hero min-h-[70vh]" dir="rtl">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<p class="text-8xl font-black opacity-20">{page.status}</p>
			<h1 class="mt-4 text-3xl font-black">{title}</h1>
			<p class="mt-3 text-base-content/60">{description}</p>
			<a href={`${base}/device`} class="btn btn-primary mt-8 gap-2">
				<span class="text-lg">🏠</span>
				{KIOSK_TEXTS.ERROR_PAGE_HOME}
			</a>
		</div>
	</div>
</div>
