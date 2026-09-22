import { describe, expect, it } from 'vitest';
import {
	clampCfgToMax,
	parseVolumeCfg,
	renderInjectJs,
	serializeVolumeCfg
} from '$lib/booster-config';

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

	it('🔴 safety-net clamp בבוסטר (min(gameLevel,maxLevel) וגם min(otherLevel,maxLevel))', () => {
		const empty = renderInjectJs('');
		expect(empty.includes('Math.min(d.gameLevel,d.maxLevel)')).toBe(true);
		expect(empty.includes('Math.min(d.otherLevel,d.maxLevel)')).toBe(true);
	});
});

describe('serializeVolumeCfg', () => {
	it('clamp מעל 100', () => {
		expect(JSON.parse(serializeVolumeCfg({ gameLevel: 150, otherLevel: -5 })).gameLevel).toBe(100);
	});

	it('clamp מתחת ל-0', () => {
		expect(JSON.parse(serializeVolumeCfg({ gameLevel: 150, otherLevel: -5 })).otherLevel).toBe(0);
	});

	it('stream ברירת-מחדל 3', () => {
		expect(JSON.parse(serializeVolumeCfg({ gameLevel: 80, otherLevel: 20 })).stream).toBe(3);
	});

	it('maxLevel ברירת-מחדל 100 כשחסר', () => {
		expect(JSON.parse(serializeVolumeCfg({ gameLevel: 80, otherLevel: 20 })).maxLevel).toBe(100);
	});

	it('maxLevel נשמר + clamp', () => {
		expect(
			JSON.parse(serializeVolumeCfg({ gameLevel: 80, otherLevel: 20, maxLevel: 150 })).maxLevel
		).toBe(100);
	});

	it('maxLevel=50 נשמר', () => {
		expect(
			JSON.parse(serializeVolumeCfg({ gameLevel: 80, otherLevel: 20, maxLevel: 50 })).maxLevel
		).toBe(50);
	});
});

describe('parseVolumeCfg', () => {
	it('ריק → ברירות-מחדל כולל maxLevel:100', () => {
		expect(JSON.stringify(parseVolumeCfg(''))).toBe(
			'{"gameLevel":80,"otherLevel":20,"maxLevel":100,"stream":3}'
		);
	});

	it('פגום → ברירות-מחדל', () => {
		expect(parseVolumeCfg('not json{').gameLevel).toBe(80);
		expect(parseVolumeCfg('not json{').maxLevel).toBe(100);
	});

	it('חלקי → מיזוג', () => {
		expect(parseVolumeCfg('{"gameLevel":70}').gameLevel).toBe(70);
		expect(parseVolumeCfg('{"gameLevel":70}').otherLevel).toBe(20);
	});

	it('maxLevel חלקי → מיזוג', () => {
		expect(parseVolumeCfg('{"maxLevel":40}').maxLevel).toBe(40);
		expect(parseVolumeCfg('{"maxLevel":40}').gameLevel).toBe(80);
	});

	it('round-trip serialize→parse', () => {
		expect(
			parseVolumeCfg(serializeVolumeCfg({ gameLevel: 95, otherLevel: 15, stream: 3 })).gameLevel
		).toBe(95);
	});

	it('round-trip maxLevel', () => {
		expect(
			parseVolumeCfg(serializeVolumeCfg({ gameLevel: 95, otherLevel: 15, maxLevel: 60, stream: 3 }))
				.maxLevel
		).toBe(60);
	});
});

describe('clampCfgToMax', () => {
	it('חותך gameLevel/otherLevel מעל maxLevel', () => {
		const result = clampCfgToMax({ gameLevel: 80, otherLevel: 90, maxLevel: 50, stream: 3 });
		expect(result.gameLevel).toBe(50);
		expect(result.otherLevel).toBe(50);
	});

	it('לא נוגע בערך מתחת ל-maxLevel', () => {
		const result = clampCfgToMax({ gameLevel: 30, otherLevel: 20, maxLevel: 50, stream: 3 });
		expect(result.gameLevel).toBe(30);
		expect(result.otherLevel).toBe(20);
	});
});
