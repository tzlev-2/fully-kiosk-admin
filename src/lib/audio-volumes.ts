/** מוצא את הזרם ב-audioVolumes לפי מפתח (לא אינדקס) — הסדר במערך שרירותי. */
export function volumeFromAudioVolumes(
	list: Record<string, number>[] | undefined,
	stream = 3
): number | null {
	if (!Array.isArray(list)) return null;
	const key = String(stream);
	for (const item of list) {
		const value = item[key];
		if (typeof value === 'number') return value;
	}
	return null;
}
