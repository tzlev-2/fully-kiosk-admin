<script lang="ts">
	import { getContext } from 'svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import { createBrowserSettingsWriter } from '$lib/settings-writer';

	const device = getContext<KioskDevice>('kiosk-device');
	const writer = createBrowserSettingsWriter();

	let gameLevel = $state(device.volumeCfg.gameLevel);
	let otherLevel = $state(device.volumeCfg.otherLevel);

	$effect(() => {
		void device.loadVolumeCfg(writer);
	});

	$effect(() => {
		gameLevel = device.volumeCfg.gameLevel;
		otherLevel = device.volumeCfg.otherLevel;
	});

	async function onGameChange() {
		const next = { ...device.volumeCfg, gameLevel };
		try {
			await device.saveVolumeCfg(writer, next);
		} catch {
			gameLevel = device.volumeCfg.gameLevel;
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		}
	}

	async function onRewardChange() {
		const next = { ...device.volumeCfg, otherLevel };
		try {
			await device.saveVolumeCfg(writer, next);
		} catch {
			otherLevel = device.volumeCfg.otherLevel;
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
		}
	}
</script>

<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">🎚️ {KIOSK_TEXTS.VOLUME_LABEL}</h2>

		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">{KIOSK_TEXTS.VOLUME_GAME_LABEL}</span>
			<input
				type="range"
				min="0"
				max="100"
				step="1"
				data-testid="volume-game"
				bind:value={gameLevel}
				onchange={onGameChange}
			/>
		</label>

		<label class="flex flex-col gap-1">
			<span class="text-sm font-semibold">{KIOSK_TEXTS.VOLUME_REWARD_LABEL}</span>
			<input
				type="range"
				min="0"
				max="100"
				step="1"
				data-testid="volume-reward"
				bind:value={otherLevel}
				onchange={onRewardChange}
			/>
		</label>
	</div>
</div>
