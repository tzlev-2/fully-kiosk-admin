const START = '/*BOOSTER:START*/';
const END = '/*BOOSTER:END*/';

const BOOSTER_IIFE = `(function(){var B=window.__booster=window.__booster||(function(){var h={},f={};function addHook(n,fn,o){(h[n]=h[n]||[]).push(fn);if((!o||o.sticky!==false)&&(n in f)){try{fn(f[n]);}catch(e){}}return function(){h[n]=(h[n]||[]).filter(function(x){return x!==fn;});};}function runHooks(n,p){f[n]=p;(h[n]||[]).forEach(function(fn){try{fn(p);}catch(e){if(n!=="booster:error")runHooks("booster:error",{hook:n,err:String(e)});}});}function applyHooks(n,v,c){(h[n]||[]).forEach(function(fn){try{var r=fn(v,c);if(r!==undefined)v=r;}catch(e){}});return v;}return{addHook:addHook,runHooks:runHooks,applyHooks:applyHooks};})();if(!B.__wired){B.__wired=true;document.addEventListener("visibilitychange",function(){B.runHooks(document.hidden?"lifecycle:hidden":"lifecycle:visible");});if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",function(){B.runHooks("lifecycle:load");});else B.runHooks("lifecycle:load");B.runHooks(document.hidden?"lifecycle:hidden":"lifecycle:visible");}if(!B.__volume){B.__volume=true;function readCfg(){var d={gameLevel:80,otherLevel:20,stream:3,maxLevel:100};try{if(typeof fully==="undefined"||!fully.getStringSetting){B.runHooks("booster:error",{mod:"volume",msg:"no-fully-bridge"});return d;}var raw=fully.getStringSetting("boosterVolumeCfg");if(!raw){B.runHooks("booster:error",{mod:"volume",msg:"unconfigured-device"});return d;}var p=JSON.parse(raw);if(typeof p.maxLevel==="number")d.maxLevel=Math.max(0,Math.min(100,p.maxLevel));if(typeof p.gameLevel==="number")d.gameLevel=Math.max(0,Math.min(100,p.gameLevel));if(typeof p.otherLevel==="number")d.otherLevel=Math.max(0,Math.min(100,p.otherLevel));if(typeof p.stream==="number")d.stream=p.stream;d.gameLevel=Math.min(d.gameLevel,d.maxLevel);d.otherLevel=Math.min(d.otherLevel,d.maxLevel);}catch(e){B.runHooks("booster:error",{mod:"volume",err:String(e)});}return d;}function setMusic(v,s){if(typeof fully!=="undefined"&&fully.setAudioVolume){try{fully.setAudioVolume(v,s);}catch(e){B.runHooks("booster:error",{mod:"volume",err:String(e)});}}}B.addHook("lifecycle:visible",function(){var c=readCfg();setMusic(c.gameLevel,c.stream);});B.addHook("lifecycle:hidden",function(){var c=readCfg();setMusic(c.otherLevel,c.stream);});}})();`;

export type VolumeCfg = { gameLevel: number; otherLevel: number; maxLevel: number; stream: number };

const clamp = (n: number) => Math.max(0, Math.min(100, n));

/** read-modify-write אידמפוטנטי: מוסיף/מחליף רק את הבלוק המתוחם, שומר כל השאר. */
export function renderInjectJs(existing = ''): string {
	const block = START + BOOSTER_IIFE + END;
	const s = existing.indexOf(START);
	const e = existing.indexOf(END);
	if (s !== -1 && e !== -1 && e > s) {
		return existing.slice(0, s) + block + existing.slice(e + END.length);
	}
	return existing ? existing.replace(/\s*$/, '') + '\n' + block : block;
}

/** {gameLevel, otherLevel, maxLevel, stream} → JSON ל-boosterVolumeCfg. clamp 0–100, maxLevel/stream ברירת-מחדל 100/3. */
export function serializeVolumeCfg(cfg: {
	gameLevel: number;
	otherLevel: number;
	maxLevel?: number;
	stream?: number;
}): string {
	return JSON.stringify({
		gameLevel: clamp(Number(cfg.gameLevel)),
		otherLevel: clamp(Number(cfg.otherLevel)),
		maxLevel: typeof cfg.maxLevel === 'number' ? clamp(cfg.maxLevel) : 100,
		stream: typeof cfg.stream === 'number' ? cfg.stream : 3
	});
}

/** סובלני: ריק/פגום → {80,20,100,3}; clamp על ערכים חוקיים. */
export function parseVolumeCfg(raw?: string): VolumeCfg {
	const d: VolumeCfg = { gameLevel: 80, otherLevel: 20, maxLevel: 100, stream: 3 };
	if (!raw) return d;
	try {
		const p = JSON.parse(raw) as Partial<VolumeCfg>;
		if (typeof p.gameLevel === 'number') d.gameLevel = clamp(p.gameLevel);
		if (typeof p.otherLevel === 'number') d.otherLevel = clamp(p.otherLevel);
		if (typeof p.maxLevel === 'number') d.maxLevel = clamp(p.maxLevel);
		if (typeof p.stream === 'number') d.stream = p.stream;
	} catch {
		/* fallthrough → defaults */
	}
	return d;
}

/** חיתוך הרסני: gameLevel/otherLevel לא יכולים לעלות מעל maxLevel. */
export function clampCfgToMax(cfg: VolumeCfg): VolumeCfg {
	return {
		...cfg,
		gameLevel: Math.min(cfg.gameLevel, cfg.maxLevel),
		otherLevel: Math.min(cfg.otherLevel, cfg.maxLevel)
	};
}
