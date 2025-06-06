"use client";

import { Button } from '@/components/ui/button';
import { CustomModal } from '@/components/ui/custom-modal';
import { 
  MapPin, 
  Smartphone, 
  Monitor, 
  Globe, 
  AlertTriangle, 
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

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
}

export function CrossBrowserLocationGuide({ 
  isVisible, 
  browserInfo, 
  permissionState, 
  onRequestLocation,
  onClose 
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
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            通常のウィンドウでアクセスしてください。
          </p>
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

          {permissionState === 'denied' && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold text-amber-800 mb-2">
                位置情報が拒否されています
              </h3>
              <p className="text-sm text-amber-700">
                {browserName}での位置情報許可方法については、各自でお調べください。
              </p>
            </div>
          )}
        </div>

        <div className="space-y-3">
          <Button 
            onClick={onRequestLocation}
            className="w-full bg-blue-600 hover:bg-blue-700"
            size="lg"
          >
            <MapPin className="h-5 w-5 mr-2" />
            位置情報を許可する
          </Button>
          
          {onClose && (
            <Button 
              variant="outline" 
              onClick={()=>{
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