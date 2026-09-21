export function captureGapMs(connectedCount: number): number {
	void connectedCount;
	return 1500;
}

export async function runCaptureRound(
	captureFns: Array<() => Promise<unknown>>,
	connectedCount: number,
	wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
): Promise<void> {
	const gap = captureGapMs(connectedCount);
	for (let i = 0; i < captureFns.length; i++) {
		await captureFns[i]();
		if (i < captureFns.length - 1) {
			await wait(gap);
		}
	}
}
