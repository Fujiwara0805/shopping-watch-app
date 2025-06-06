// lib/utils/LocationPermissionManager.ts
// 位置情報許可状態の管理を行うユーティリティクラス

interface LocationPermissionData {
  isGranted: boolean;
  timestamp: number;
  expiresAt: number;
}

export class LocationPermissionManager {
  private static readonly STORAGE_KEY = 'location_permission_data';
  private static readonly PERMISSION_DURATION = 60 * 60 * 1000; // 1時間（ミリ秒）

  /**
   * 位置情報許可を保存
   */
  static savePermission(): void {
    try {
      const now = Date.now();
      const data: LocationPermissionData = {
        isGranted: true,
        timestamp: now,
        expiresAt: now + this.PERMISSION_DURATION
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('LocationPermissionManager: Permission saved', {
        grantedAt: new Date(now).toLocaleString(),
        expiresAt: new Date(data.expiresAt).toLocaleString()
      });
    } catch (error) {
      console.warn('LocationPermissionManager: Failed to save permission', error);
    }
  }

  /**
   * 位置情報許可状態をチェック
   */
  static checkPermission(): {
    isGranted: boolean;
    isExpired: boolean;
    remainingTime: number;
  } {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      
      if (!storedData) {
        return { isGranted: false, isExpired: false, remainingTime: 0 };
      }

      const data: LocationPermissionData = JSON.parse(storedData);
      const now = Date.now();
      const isExpired = now > data.expiresAt;
      const remainingTime = Math.max(0, data.expiresAt - now);

      console.log('LocationPermissionManager: Permission check', {
        isGranted: data.isGranted,
        isExpired,
        remainingTime: Math.round(remainingTime / 1000 / 60), // 分単位
        expiresAt: new Date(data.expiresAt).toLocaleString()
      });

      if (isExpired) {
        this.clearPermission();
        return { isGranted: false, isExpired: true, remainingTime: 0 };
      }

      return {
        isGranted: data.isGranted,
        isExpired: false,
        remainingTime
      };
    } catch (error) {
      console.warn('LocationPermissionManager: Failed to check permission', error);
      return { isGranted: false, isExpired: false, remainingTime: 0 };
    }
  }

  /**
   * 許可状態をクリア
   */
  static clearPermission(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('LocationPermissionManager: Permission cleared');
    } catch (error) {
      console.warn('LocationPermissionManager: Failed to clear permission', error);
    }
  }

  /**
   * 許可の有効期限を延長
   */
  static extendPermission(): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (!storedData) return;

      const data: LocationPermissionData = JSON.parse(storedData);
      const now = Date.now();
      
      // 現在時刻から1時間延長
      data.expiresAt = now + this.PERMISSION_DURATION;
      data.timestamp = now;
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
      console.log('LocationPermissionManager: Permission extended', {
        newExpiresAt: new Date(data.expiresAt).toLocaleString()
      });
    } catch (error) {
      console.warn('LocationPermissionManager: Failed to extend permission', error);
    }
  }

  /**
   * 残り時間を分単位で取得
   */
  static getRemainingMinutes(): number {
    const { remainingTime } = this.checkPermission();
    return Math.round(remainingTime / 1000 / 60);
  }

  /**
   * デバッグ用: 許可情報の詳細を取得
   */
  static getPermissionInfo(): {
    hasStoredData: boolean;
    data: LocationPermissionData | null;
    currentTime: string;
  } {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      const data = storedData ? JSON.parse(storedData) : null;
      
      return {
        hasStoredData: !!storedData,
        data,
        currentTime: new Date().toLocaleString()
      };
    } catch (error) {
      return {
        hasStoredData: false,
        data: null,
        currentTime: new Date().toLocaleString()
      };
    }
  }
}