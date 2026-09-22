import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const SRC_ROOT = join(import.meta.dirname, '..', '..', '..');

function svelteFiles(dir: string): string[] {
	const entries = readdirSync(dir, { withFileTypes: true });
	const files: string[] = [];
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			files.push(...svelteFiles(full));
		} else if (entry.isFile() && entry.name.endsWith('.svelte')) {
			files.push(full);
		}
	}
	return files;
}

describe('G5: VolumeControl is the sole owner of <input type="range">', () => {
	const files = svelteFiles(SRC_ROOT);

	it('type="range" appears only inside VolumeControl.svelte', () => {
		const withRange = files.filter((f) => readFileSync(f, 'utf8').includes('type="range"'));
		expect(withRange).toEqual([join(SRC_ROOT, 'routes', 'd', '[id]', 'VolumeControl.svelte')]);
	});

	it('<VolumeControl is used exactly four times across the tree', () => {
		const total = files.reduce((sum, f) => {
			const matches = readFileSync(f, 'utf8').match(/<VolumeControl\b/g);
			return sum + (matches?.length ?? 0);
		}, 0);
		expect(total).toBe(4);
	});
});
