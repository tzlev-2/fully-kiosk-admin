import type { AppListItem, BaseResponse, DeviceInfoResponse } from './fullyKioskTypes';
// BaseResponse נדרש עבור lockKiosk/unlockKiosk/loadUrl שמחזירים status

/**
 * לקוח REST עבור Fully Kiosk Browser
 * עותק מקומי מפושט של rest-interface/client.ts
 */
export class FullyKioskClient {
	private baseUrl: string;
	private password: string;

	/**
	 * @param baseUrl כתובת בסיס — לדוגמה: http://192.168.1.50:2323
	 * @param password סיסמת Remote Admin
	 */
	constructor(baseUrl: string, password: string) {
		// הסרת slash אחרון אם קיים
		this.baseUrl = baseUrl.replace(/\/$/, '');
		this.password = password;
	}

	/**
	 * שולח פקודה ל-Fully Kiosk REST API
	 */
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	private async request<T>(
		cmd: string,
		params: Record<string, string | number | boolean> = {}
	): Promise<T> {
		const url = new URL(this.baseUrl + '/');
		url.searchParams.append('cmd', cmd);
		url.searchParams.append('password', this.password);
		url.searchParams.append('type', 'json');

		for (const [key, value] of Object.entries(params)) {
			if (value !== undefined) {
				url.searchParams.append(key, String(value));
			}
		}

		const response = await fetch(url.toString(), { signal: AbortSignal.timeout(8000) });
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}
		return response.json() as Promise<T>;
	}

	async getDeviceInfo(): Promise<DeviceInfoResponse> {
		return this.request<DeviceInfoResponse>('getDeviceInfo');
	}

	async enableKioskMode(): Promise<BaseResponse> {
		return this.request<BaseResponse>('setBooleanSetting', { key: 'kioskMode', value: true });
	}

	async disableKioskMode(): Promise<BaseResponse> {
		return this.request<BaseResponse>('setBooleanSetting', { key: 'kioskMode', value: false });
	}

	async loadUrl(url: string): Promise<BaseResponse> {
		return this.request<BaseResponse>('loadUrl', { url });
	}

	async loadStartUrl(): Promise<BaseResponse> {
		return this.request<BaseResponse>('loadStartUrl');
	}

	async screenOn(): Promise<BaseResponse> {
		return this.request<BaseResponse>('screenOn');
	}

	async screenOff(): Promise<BaseResponse> {
		return this.request<BaseResponse>('screenOff');
	}

	async toForeground(): Promise<BaseResponse> {
		return this.request<BaseResponse>('toForeground');
	}

	async toBackground(): Promise<BaseResponse> {
		return this.request<BaseResponse>('toBackground');
	}

	async lockKiosk(): Promise<BaseResponse> {
		return this.request<BaseResponse>('lockKiosk');
	}

	async unlockKiosk(): Promise<BaseResponse> {
		return this.request<BaseResponse>('unlockKiosk');
	}

	async enableLockedMode(): Promise<BaseResponse> {
		return this.request<BaseResponse>('enableLockedMode');
	}

	async disableLockedMode(): Promise<BaseResponse> {
		return this.request<BaseResponse>('disableLockedMode');
	}

	async restartApp(): Promise<BaseResponse> {
		return this.request<BaseResponse>('restartApp');
	}

	async rebootDevice(): Promise<BaseResponse> {
		return this.request<BaseResponse>('rebootDevice');
	}

	async setAudioVolume(level: number, stream: number = 3): Promise<BaseResponse> {
		return this.request<BaseResponse>('setAudioVolume', { level, stream });
	}

	async getScreenshot(): Promise<Blob> {
		const url = new URL(this.baseUrl + '/');
		url.searchParams.append('cmd', 'getScreenshot');
		url.searchParams.append('password', this.password);
		const response = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) });
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		return response.blob();
	}

	async startApplication(packageName: string): Promise<BaseResponse> {
		return this.request<BaseResponse>('startApplication', { package: packageName });
	}

	async getAppsList(): Promise<AppListItem[]> {
		return this.request<AppListItem[]>('manageApps');
	}
}
