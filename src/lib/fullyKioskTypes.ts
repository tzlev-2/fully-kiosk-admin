// טיפוסים עבור Fully Kiosk REST API
// מבוסס על התשובה האמיתית של getDeviceInfo

export interface AppListItem {
	icon: string;        // Base64 של האייקון
	label: string;       // שם האפליקציה
	package: string;     // Package Name
	version: string;
	versionCode: number;
}

export interface RecentApp {
	package: string;
	label: string;
	icon: string;
}

export interface BaseResponse {
	status?: 'OK' | 'NOK';
	statustext?: string;
	error?: string;
}

// תשובת getDeviceInfo — הAPI מחזיר ישירות JSON ללא עטיפת status
export interface DeviceInfoResponse {
	deviceId: string;
	deviceName: string;
	model: string;
	manufacturer: string;
	androidVersion: string;
	version: string;

	// מצב מסך וסוללה
	screenOn: boolean;
	plugged: boolean;
	batteryLevel: number;

	// מצב קיוסק
	kioskLocked: boolean;
	kioskMode: boolean;
	maintenanceMode: boolean;

	// דפדפן
	currentPageUrl: string;
	startUrl: string;

	// שומר מסך ושינה
	isInScreensaver: boolean;
	isInForcedSleep: boolean;
	isInDaydream: boolean;

	// רשת
	ip4: string;
	SSID: string;
}
