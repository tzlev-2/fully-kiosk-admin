<script lang="ts">
	import { kiosk } from '$lib/kiosk-store.svelte';
	import { KIOSK_TEXTS } from '$lib/texts';

	let navUrl = $state('');
	let volumeLevel = $state(70);
	let busy = $state(false);

	function showBulkResult(label: string, result: { ok: number; total: number }) {
		if (result.total === 0) {
			kiosk.showFeedback('error', KIOSK_TEXTS.NO_DEVICES);
			return;
		}
		if (result.ok === 0) {
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
			return;
		}
		if (result.ok === result.total) {
			kiosk.showFeedback('success', KIOSK_TEXTS.BULK_DONE(label, result.total));
			return;
		}
		kiosk.showFeedback('success', KIOSK_TEXTS.BULK_PARTIAL(result.ok, result.total));
	}

	async function runBulk(label: string, action: () => Promise<{ ok: number; total: number }>) {
		if (kiosk.devices.length === 0) {
			kiosk.showFeedback('error', KIOSK_TEXTS.NO_DEVICES);
			return;
		}
		busy = true;
		try {
			showBulkResult(label, await action());
		} finally {
			busy = false;
		}
	}

	async function bulkNavigate() {
		const url = navUrl.trim();
		if (!url) return;
		await runBulk(KIOSK_TEXTS.SUCCESS_NAVIGATED, () => kiosk.bulk((d) => d.navigateToUrl(url)));
	}

	async function bulkScreenOn() {
		await runBulk(KIOSK_TEXTS.SUCCESS_SCREEN_ON, () => kiosk.bulk((d) => d.screenOn()));
	}

	async function bulkScreenOff() {
		await runBulk(KIOSK_TEXTS.SUCCESS_SCREEN_OFF, () => kiosk.bulk((d) => d.screenOff()));
	}

	async function bulkLock() {
		await runBulk(KIOSK_TEXTS.SUCCESS_LOCKED, () => kiosk.bulk((d) => d.lock()));
	}

	async function bulkUnlock() {
		await runBulk(KIOSK_TEXTS.SUCCESS_UNLOCKED, () => kiosk.bulk((d) => d.unlock()));
	}

	async function bulkVolume() {
		const level = volumeLevel;
		await runBulk(KIOSK_TEXTS.VOLUME_LABEL, () => kiosk.bulk((d) => d.setVolume(level)));
	}

	async function bulkRestartApp() {
		if (!window.confirm(KIOSK_TEXTS.CONFIRM_RESTART_APP)) return;
		await runBulk(KIOSK_TEXTS.SUCCESS_RESTART_APP, () => kiosk.bulk((d) => d.restartApp()));
	}
</script>

<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
	<div class="card-body gap-4">
		<h3 class="text-sm font-semibold">⚡ {KIOSK_TEXTS.ACTIONS_SECTION}</h3>

		<div class="flex flex-wrap items-end gap-2">
			<label class="form-control min-w-[14rem] flex-1">
				<span class="label-text text-xs">{KIOSK_TEXTS.WEBSITES_SECTION}</span>
				<input
					class="input-bordered direction-ltr input input-sm w-full"
					dir="ltr"
					placeholder={KIOSK_TEXTS.WEBSITE_URL_PLACEHOLDER}
					bind:value={navUrl}
				/>
			</label>
			<button class="btn btn-sm btn-primary" onclick={bulkNavigate} disabled={busy}>
				{KIOSK_TEXTS.BULK_NAV}
			</button>
		</div>

		<div class="flex flex-wrap gap-2">
			<button class="btn btn-outline btn-sm" onclick={bulkScreenOn} disabled={busy}>
				{KIOSK_TEXTS.SCREEN_ALL_ON}
			</button>
			<button class="btn btn-outline btn-sm" onclick={bulkScreenOff} disabled={busy}>
				{KIOSK_TEXTS.SCREEN_ALL_OFF}
			</button>
			<button class="btn btn-outline btn-sm" onclick={bulkLock} disabled={busy}>
				{KIOSK_TEXTS.LOCK_ALL}
			</button>
			<button class="btn btn-outline btn-sm" onclick={bulkUnlock} disabled={busy}>
				{KIOSK_TEXTS.UNLOCK_ALL}
			</button>
		</div>

		<div class="flex flex-wrap items-end gap-2">
			<label class="form-control w-24">
				<span class="label-text text-xs">{KIOSK_TEXTS.VOLUME_LABEL}</span>
				<input
					class="input-bordered input input-sm w-full"
					type="number"
					min="0"
					max="100"
					bind:value={volumeLevel}
				/>
			</label>
			<button class="btn btn-outline btn-sm" onclick={bulkVolume} disabled={busy}>
				{KIOSK_TEXTS.BULK_VOLUME}
			</button>
			<button class="btn btn-sm btn-warning" onclick={bulkRestartApp} disabled={busy}>
				{KIOSK_TEXTS.RESTART_APP_BTN}
			</button>
		</div>
	</div>
</div>
