import { describe, expect, it } from 'vitest';
import { splitIp4 } from './ip4';

describe('splitIp4', () => {
	it('splits comma-separated addresses and trims empty segments', () => {
		expect(splitIp4('192.168.1.107,10.8.0.4')).toEqual(['192.168.1.107', '10.8.0.4']);
		expect(splitIp4(' 192.168.1.1 , , 10.0.0.2 ')).toEqual(['192.168.1.1', '10.0.0.2']);
	});
});
