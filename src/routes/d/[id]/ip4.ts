export function splitIp4(ip4: string): string[] {
	return ip4
		.split(',')
		.map((part) => part.trim())
		.filter(Boolean);
}
