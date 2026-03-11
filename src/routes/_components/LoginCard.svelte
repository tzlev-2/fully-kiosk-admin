<script lang="ts">
	import { KIOSK_TEXTS, CONNECTION_STATUS_TEXT } from '$lib/texts';
	import { ctrl } from '$lib/kioskController.svelte';

	let { onConnect }: { onConnect: () => void } = $props();
</script>

<div class="min-h-screen flex items-center justify-center bg-base-200 p-4" dir="rtl">
	<div class="card bg-base-100 shadow-xl w-full max-w-sm">
		<div class="card-body gap-5">
			<div class="text-center">
				<h1 class="text-2xl font-black">🖥️ {KIOSK_TEXTS.PAGE_TITLE}</h1>
				<p class="text-base-content/60 text-sm mt-1">{KIOSK_TEXTS.LOGIN_SUBTITLE}</p>
			</div>

			<div class="flex flex-col gap-3">
				<label class="form-control w-full">
					<div class="label pb-1">
						<span class="label-text font-semibold">{KIOSK_TEXTS.ADDRESS_LABEL}</span>
					</div>
					<input
						id="address"
						type="text"
						class="input input-bordered w-full"
						bind:value={ctrl.baseUrl}
						placeholder={KIOSK_TEXTS.ADDRESS_PLACEHOLDER}
						dir="ltr"
					/>
				</label>

				<label class="form-control w-full">
					<div class="label pb-1">
						<span class="label-text font-semibold">{KIOSK_TEXTS.PASSWORD_LABEL}</span>
					</div>
					<input
						id="password"
						type="password"
						class="input input-bordered w-full"
						bind:value={ctrl.password}
					/>
				</label>

				<button
					class="btn btn-primary w-full mt-1"
					onclick={onConnect}
					disabled={ctrl.isConnecting || !ctrl.baseUrl}
				>
					{#if ctrl.isConnecting}
						<span class="loading loading-spinner loading-sm"></span>
					{/if}
					{ctrl.isConnecting ? KIOSK_TEXTS.CONNECTING : KIOSK_TEXTS.CONNECT_BTN}
				</button>

				{#if CONNECTION_STATUS_TEXT[ctrl.connectionStatus]}
					<p
						class="text-sm text-center text-base-content/60"
						class:text-error={ctrl.connectionStatus.startsWith('error')}
						class:font-semibold={ctrl.connectionStatus.startsWith('error')}
					>
						{CONNECTION_STATUS_TEXT[ctrl.connectionStatus]}
					</p>
				{/if}
			</div>

			{#if ctrl.feedback}
				<div
					role="alert"
					class="alert text-sm font-semibold"
					class:alert-success={ctrl.feedback.type === 'success'}
					class:alert-error={ctrl.feedback.type === 'error'}
				>
					{ctrl.feedback.message}
				</div>
			{/if}
		</div>
	</div>
</div>
