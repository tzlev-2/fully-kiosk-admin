import { describe, expect, it, vi } from 'vitest';
import { captureGapMs, runCaptureRound } from './capture-gap';

describe('captureGapMs', () => {
	it('returns 1500 for 0, 1, and 3 connected devices', () => {
		expect(captureGapMs(0)).toBe(1500);
		expect(captureGapMs(1)).toBe(1500);
		expect(captureGapMs(3)).toBe(1500);
	});
});

describe('runCaptureRound', () => {
	it('does not start the second capture before the first completes', async () => {
		const order: number[] = [];
		let releaseFirst: () => void;
		const firstGate = new Promise<void>((resolve) => {
			releaseFirst = resolve;
		});

		const captures = [
			async () => {
				order.push(1);
				await firstGate;
			},
			async () => {
				order.push(2);
			}
		];

		const round = runCaptureRound(captures, 2, async () => {});

		await vi.waitFor(() => expect(order).toEqual([1]));
		expect(order).not.toContain(2);

		releaseFirst!();
		await round;

		expect(order).toEqual([1, 2]);
	});
});
