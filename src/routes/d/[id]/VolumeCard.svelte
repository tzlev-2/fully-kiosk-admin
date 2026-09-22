<script lang="ts">
	import { getContext, untrack } from 'svelte';
	import { KIOSK_TEXTS } from '$lib/texts';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';
	import { createBrowserSettingsWriter } from '$lib/settings-writer';
	import VolumeControl from './VolumeControl.svelte';

	const device = getContext<KioskDevice>('kiosk-device');
	const writer = createBrowserSettingsWriter();

	let advanced = $state(false);

	$effect(() => {
		// device.loadVolumeCfg קוראת device.volumeCfg (דרך toRecord) וגם כותבת אותו —
		// בלי untrack זה effect שמפעיל את עצמו שוב בכל כתיבה (ר' תיעוד $effect).
		untrack(() => {
			void device.loadVolumeCfg(writer);
		});
	});

	async function saveField(
		field: 'gameLevel' | 'otherLevel' | 'maxLevel',
		v: number
	): Promise<boolean> {
		try {
			await device.saveVolumeCfg(writer, { ...device.volumeCfg, [field]: v });
			return true;
		} catch {
			kiosk.showFeedback('error', KIOSK_TEXTS.ERROR_COMMAND);
			return false;
		}
	}
</script>

<div class="card border border-base-content/10 bg-base-100/80 shadow-sm backdrop-blur">
	<div class="card-body gap-4">
		<h2 class="card-title text-base">🔊 {KIOSK_TEXTS.VOLUME_LABEL}</h2>

		<div class="flex items-center gap-2">
			<div class="flex-1">
				<VolumeControl
					label={KIOSK_TEXTS.VOLUME_NOW_LABEL}
					value={device.volumeLevel}
					testId="volume-now"
					onCommit={(v) => device.setVolume(v)}
				/>
			</div>
			<button
				class="btn btn-circle btn-sm"
				class:btn-error={device.isMuted}
				class:btn-ghost={!device.isMuted}
				onclick={() => device.toggleMute()}
				aria-label={device.isMuted ? KIOSK_TEXTS.VOLUME_UNMUTE : KIOSK_TEXTS.VOLUME_MUTE}
				>{device.isMuted ? '🔇' : '🔊'}</button
			>
		</div>

		<div
			class="collapse border border-base-content/10 bg-base-100/50"
			class:collapse-open={advanced}
		>
			<button
				type="button"
				class="collapse-title cursor-pointer text-sm font-semibold"
				data-testid="volume-advanced"
				aria-expanded={advanced}
				onclick={() => (advanced = !advanced)}
			>
				{KIOSK_TEXTS.VOLUME_ADVANCED}
			</button>
			<div class="collapse-content">
				{#if advanced}
					<div class="flex flex-col gap-4 pt-2">
						<VolumeControl
							label={KIOSK_TEXTS.VOLUME_GAME_LABEL}
							value={device.volumeCfg.gameLevel}
							max={device.volumeCfg.maxLevel}
							testId="volume-game"
							onCommit={(v) => saveField('gameLevel', v)}
						/>
						<VolumeControl
							label={KIOSK_TEXTS.VOLUME_REWARD_LABEL}
							value={device.volumeCfg.otherLevel}
							max={device.volumeCfg.maxLevel}
							testId="volume-reward"
							onCommit={(v) => saveField('otherLevel', v)}
						/>
						<VolumeControl
							label={KIOSK_TEXTS.VOLUME_MAX_LABEL}
							value={device.volumeCfg.maxLevel}
							max={100}
							testId="volume-max"
							onCommit={(v) => saveField('maxLevel', v)}
						/>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
