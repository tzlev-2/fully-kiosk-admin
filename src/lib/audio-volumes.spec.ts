import { describe, expect, it } from 'vitest';
import { volumeFromAudioVolumes } from './audio-volumes';

describe('volumeFromAudioVolumes', () => {
	it('🔴 חיפוש לפי מפתח, לא לפי אינדקס — המערך שנמדד → 100', () => {
		const measured: Record<string, number>[] = [
			{ '4': 71 },
			{ '8': 80 },
			{ '5': 53 },
			{ '3': 100 },
			{ '1': 80 },
			{ '0': 33 },
			{ '2': 80 }
		];
		expect(volumeFromAudioVolumes(measured)).toBe(100);
	});

	it('undefined → null', () => {
		expect(volumeFromAudioVolumes(undefined)).toBeNull();
	});

	it('לא-מערך → null', () => {
		expect(volumeFromAudioVolumes({ '3': 100 } as unknown as Record<string, number>[])).toBeNull();
	});

	it('אין איבר עם String(stream) → null', () => {
		expect(volumeFromAudioVolumes([{ '4': 71 }, { '8': 80 }])).toBeNull();
	});

	it('ערך לא-מספרי → null', () => {
		expect(volumeFromAudioVolumes([{ '3': 'loud' as unknown as number }])).toBeNull();
	});

	it('stream ברירת-מחדל 3', () => {
		expect(volumeFromAudioVolumes([{ '3': 42 }])).toBe(42);
	});

	it('stream מפורש', () => {
		expect(volumeFromAudioVolumes([{ '5': 33 }], 5)).toBe(33);
	});
});
