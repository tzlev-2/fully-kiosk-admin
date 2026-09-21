<script lang="ts">
	import { KIOSK_TEXTS, CONNECTION_STATUS_TEXT } from '$lib/texts';
	import type { KioskDevice } from '$lib/kiosk-device.svelte';
	import { kiosk } from '$lib/kiosk-store.svelte';

	let {
		device = null,
		onSuccess
	}: {
		device?: KioskDevice | null;
		onSuccess?: (device: KioskDevice) => void;
	} = $props();

	let baseUrl = $state(device?.baseUrl ?? '');
	let password = $state(device?.password ?? '');
	let name = $state(device?.name ?? '');
	let connecting = $state(false);

	async function handleSubmit() {
		if (!baseUrl.trim()) return;
		connecting = true;
		try {
			let target = device;
			if (!target) {
				target = kiosk.addDevice({
					baseUrl: baseUrl.trim(),
					password,
					name: name.trim() || undefined
				});
			} else {
				target.baseUrl = baseUrl.trim();
				target.password = password;
				if (name.trim()) target.name = name.trim();
				kiosk.persist();
			}
			const connected = await kiosk.connectDevice(target);
			onSuccess?.(connected);
		} finally {
			connecting = false;
		}
	}

	const status = $derived(device?.connectionStatus ?? 'idle');
</script>

<div class="flex min-h-[50vh] items-center justify-center p-4" dir="rtl">
	<div class="card w-full max-w-sm bg-base-100 shadow-xl">
		<div class="card-body gap-5">
			<div class="text-center">
				<h1 class="text-2xl font-black">🖥️ {KIOSK_TEXTS.PAGE_TITLE}</h1>
				<p class="mt-1 text-sm text-base-content/60">{KIOSK_TEXTS.LOGIN_SUBTITLE}</p>
			</div>

			<div class="flex flex-col gap-3">
				<label class="form-control w-full">
					<div class="label pb-1">
						<span class="label-text font-semibold">{KIOSK_TEXTS.DEVICE_NAME_LABEL}</span>
					</div>
					<input
						type="text"
						class="input-bordered input w-full"
						bind:value={name}
						placeholder={KIOSK_TEXTS.DEVICE_NAME_LABEL}
					/>
				</label>

				<label class="form-control w-full">
					<div class="label pb-1">
						<span class="label-text font-semibold">{KIOSK_TEXTS.ADDRESS_LABEL}</span>
					</div>
					<input
						type="text"
						class="input-bordered input w-full"
						bind:value={baseUrl}
						placeholder={KIOSK_TEXTS.ADDRESS_PLACEHOLDER}
						dir="ltr"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label pb-1">
						<span class="label-text font-semibold">{KIOSK_TEXTS.PASSWORD_LABEL}</span>
					</div>
					<input type="password" class="input-bordered input w-full" bind:value={password} />
				</label>

				<button
					class="btn mt-1 w-full btn-primary"
					onclick={handleSubmit}
					disabled={connecting || !baseUrl.trim()}
				>
					{#if connecting}
						<span class="loading loading-sm loading-spinner"></span>
					{/if}
					{connecting ? KIOSK_TEXTS.CONNECTING : KIOSK_TEXTS.CONNECT_BTN}
				</button>

				{#if CONNECTION_STATUS_TEXT[status]}
					<p
						class="text-center text-sm text-base-content/60"
						class:text-error={status.startsWith('error')}
						class:font-semibold={status.startsWith('error')}
					>
						{CONNECTION_STATUS_TEXT[status]}
					</p>
				{/if}
			</div>
		</div>
	</div>
</div>
