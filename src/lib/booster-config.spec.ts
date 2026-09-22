import { describe, expect, it } from 'vitest';
import { parseVolumeCfg, renderInjectJs, serializeVolumeCfg } from '$lib/booster-config';

const GINGIM = `(()=>{if(window.location.hostname==="gingim.net"){fetch("https://preview.gingim.tzlev.ovh/i.js").then(r=>r.text()).then(eval);}document.querySelector('.yydev-accessibility').remove();})();`;

describe('renderInjectJs', () => {
	it('existing ריק → בלוק מתווסף', () => {
		const empty = renderInjectJs('');
		expect(empty.includes('/*BOOSTER:START*/')).toBe(true);
		expect(empty.includes('window.__booster')).toBe(true);
	});

	it('existing עם gingim → הבלוק מתווסף', () => {
		const withGingim = renderInjectJs(GINGIM);
		expect(withGingim.includes('/*BOOSTER:START*/')).toBe(true);
	});

	it('gingim נשמר', () => {
		const withGingim = renderInjectJs(GINGIM);
		expect(withGingim.includes('preview.gingim.tzlev.ovh/i.js')).toBe(true);
	});

	it('accessibility נשמר', () => {
		const withGingim = renderInjectJs(GINGIM);
		expect(withGingim.includes('.yydev-accessibility')).toBe(true);
	});

	it('אידמפוטנטי (render פעמיים = אותו פלט)', () => {
		const once = renderInjectJs(GINGIM);
		const twice = renderInjectJs(once);
		expect(twice).toBe(once);
	});

	it('אחרי render חוזר — gingim עדיין שם פעם אחת', () => {
		const once = renderInjectJs(GINGIM);
		const twice = renderInjectJs(once);
		expect((twice.match(/yydev-accessibility/g) || []).length).toBe(1);
	});

	it('אחרי render חוזר — בלוק אחד בלבד', () => {
		const once = renderInjectJs(GINGIM);
		const twice = renderInjectJs(once);
		expect((twice.match(/BOOSTER:START/g) || []).length).toBe(1);
	});
});

describe('serializeVolumeCfg', () => {
	it('clamp מעל 100', () => {
		expect(JSON.parse(serializeVolumeCfg({ gameLevel: 150, otherLevel: -5 })).gameLevel).toBe(
			100
		);
	});

	it('clamp מתחת ל-0', () => {
		expect(JSON.parse(serializeVolumeCfg({ gameLevel: 150, otherLevel: -5 })).otherLevel).toBe(
			0
		);
	});

	it('stream ברירת-מחדל 3', () => {
		expect(JSON.parse(serializeVolumeCfg({ gameLevel: 80, otherLevel: 20 })).stream).toBe(3);
	});
});

describe('parseVolumeCfg', () => {
	it('ריק → ברירות-מחדל', () => {
		expect(JSON.stringify(parseVolumeCfg(''))).toBe(
			'{"gameLevel":80,"otherLevel":20,"stream":3}'
		);
	});

	it('פגום → ברירות-מחדל', () => {
		expect(parseVolumeCfg('not json{').gameLevel).toBe(80);
	});

	it('חלקי → מיזוג', () => {
		expect(parseVolumeCfg('{"gameLevel":70}').gameLevel).toBe(70);
		expect(parseVolumeCfg('{"gameLevel":70}').otherLevel).toBe(20);
	});

	it('round-trip serialize→parse', () => {
		expect(parseVolumeCfg(serializeVolumeCfg({ gameLevel: 95, otherLevel: 15, stream: 3 })).gameLevel).toBe(
			95
		);
	});
});
