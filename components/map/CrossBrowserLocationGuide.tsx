"use client";

import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import { 
  MapPin, 
  Smartphone, 
  Monitor, 
  Globe, 
  AlertTriangle, 
  RefreshCw,
  Clock,
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { LocationPermissionManager } from '@/lib/hooks/LocationPermissionManager';

interface CrossBrowserLocationGuideProps {
  isVisible: boolean;
  browserInfo: {
    name: string;
    isPrivateMode: boolean;
    supportsPermissionsAPI: boolean;
  };
  permissionState: string;
  onRequestLocation: () => void;
  onClose?: () => void;
  // 新しく追加されたプロパティ（オプション）
  isPermissionGranted?: boolean;
  permissionRemainingMinutes?: number;
}

export function CrossBrowserLocationGuide({ 
  isVisible, 
  browserInfo, 
  permissionState, 
  onRequestLocation,
  onClose,
  isPermissionGranted = false,
  permissionRemainingMinutes = 0
}: CrossBrowserLocationGuideProps) {
  const router = useRouter();

  if (!isVisible) return null;

  // ブラウザ表示名の取得
  const getBrowserDisplayName = () => {
    switch (browserInfo.name) {
      case 'chrome': return 'Chrome';
      case 'firefox': return 'Firefox';
      case 'edge': return 'Edge';
      case 'safari': return 'Safari';
      case 'opera': return 'Opera';
      default: return 'ブラウザ';
    }
  };

  // 許可状態が有効な場合の表示
  if (isPermissionGranted && permissionRemainingMinutes > 0) {
    return (
      <CustomModal
        isOpen={isVisible}
        onClose={onClose || (() => {})}
        title="位置情報の許可状態"
        description="位置情報の利用が許可されています"
        className="max-w-md"
        showCloseButton={!!onClose}
      >
        <div className="text-center">
          <div className="bg-green-50 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                位置情報が利用可能です
              </h3>
              <div className="flex items-center justify-center text-green-700 mb-2">
                <Clock className="h-4 w-4 mr-2" />
                残り約 {permissionRemainingMinutes} 分間有効
              </div>
              <p className="text-sm text-green-700 leading-relaxed">
                この設定は約1時間有効です。時間が経過すると再度許可が必要になります。
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                利用している機能
              </h3>
              <p className="text-sm text-blue-700 leading-relaxed">
                • 現在地周辺のお店や情報を表示<br/>
                • より便利なサービス体験を提供<br/>
                • プライバシーは厳重に保護されます
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={() => {
                LocationPermissionManager.extendPermission();
                if (onClose) onClose();
              }}
              className="w-full bg-green-600 hover:bg-green-700"
              size="lg"
            >
              <Clock className="h-5 w-5 mr-2" />
              許可時間を延長する
            </Button>
            
            {onClose && (
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="w-full"
              >
                閉じる
              </Button>
            )}
          </div>
        </div>
      </CustomModal>
    );
  }

  // プライベートモードの場合
  if (browserInfo.isPrivateMode) {
    const browserName = getBrowserDisplayName();
    
    return (
      <CustomModal
        isOpen={isVisible}
        onClose={onClose || (() => {})}
        title="プライベートブラウジング中"
        description={`${browserName}のプライベートブラウジングモードでは位置情報を取得できません。`}
        className="max-w-md"
      >
        <div className="text-center">
          <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-amber-800 mb-2">
              プライベートモードの制限
            </h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              プライベートブラウジングモードでは、位置情報の保存と取得に制限があります。通常のウィンドウでアクセスしてください。
            </p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.reload()} 
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              ページを再読み込み
            </Button>
            {onClose && (
              <Button variant="outline" onClick={onClose} className="w-full">
                閉じる
              </Button>
            )}
          </div>
        </div>
      </CustomModal>
    );
  }

  const browserName = getBrowserDisplayName();

  // 通常の許可要求モーダル
  return (
    <CustomModal
      isOpen={isVisible}
      onClose={onClose || (() => {})}
      title="位置情報を許可してください"
      description="お近くのお店を探すために現在地が必要です"
      className="max-w-md"
      showCloseButton={!!onClose}
    >
      <div className="text-center">
        <div className="bg-blue-50 rounded-full p-4 w-20 h-20 mx-auto mb-6 flex items-center justify-center">
          <MapPin className="h-10 w-10 text-blue-600" />
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">
              位置情報の利用について
            </h3>
            <p className="text-sm text-blue-700 leading-relaxed">
              • 現在地周辺のお店や情報を表示<br/>
              • より便利なサービス体験を提供<br/>
              • プライバシーは厳重に保護されます
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800 mb-2">
              <Clock className="h-4 w-4 inline mr-2" />
              1時間の自動許可
            </h3>
            <p className="text-sm text-green-700 leading-relaxed">
              一度許可すると、約1時間は自動的に位置情報を利用できます。他のページに移動しても再度許可は不要です。
            </p>
          </div>

          {permissionState === 'denied' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 mb-2">
                位置情報が拒否されています
              </h3>
              <p className="text-sm text-amber-700 leading-relaxed">
                {browserName}で位置情報を許可するには、アドレスバーの🔒アイコンをクリックして設定を変更してください。
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button 
            onClick={() => {
              console.log('CrossBrowserLocationGuide: Location request triggered');
              onRequestLocation();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <MapPin className="h-5 w-5 mr-2" />
            位置情報を許可する（1時間有効）
          </Button>
          
          {onClose && (
            <Button 
              variant="outline" 
              onClick={() => {
                router.push('/');
              }} 
              className="w-full"
            >
              戻る
            </Button>
          )}
        </div>
      </div>
    </CustomModal>
  );
}