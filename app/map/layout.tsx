"use client";

import Script from "next/script";
import { useEffect } from "react";

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 地図ページ専用の初期化処理
  useEffect(() => {
    console.log("MapLayout: Initializing map page");
    
    // 地図ページ専用のクラスを追加
    document.body.classList.add('map-page-layout');
    
    // 地図ページでのスクロール制御
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.body.classList.remove('map-page-layout');
      // 離脱時にスクロールを復元
      document.body.style.overflow = '';
    };
  }, []);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!googleMapsApiKey) {
    console.error("MapLayout: NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not defined");
  }

  return (
    <>
      {/* Google Maps API Script - 確実に読み込む */}
      {googleMapsApiKey && (
        <Script
          id="google-maps-api-script"
          src={`https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,geometry&loading=async`}
          strategy="beforeInteractive"
          onLoad={() => {
            console.log("MapLayout: Google Maps API loaded successfully");
            // APIが読み込まれたことをグローバルに通知
            window.dispatchEvent(new CustomEvent('google-maps-api-loaded'));
          }}
          onError={(error) => {
            console.error("MapLayout: Failed to load Google Maps API:", error);
          }}
        />
      )}
      
      {!googleMapsApiKey && (
        <div 
          style={{ 
            position: 'fixed', 
            top: 0, 
            left: 0, 
            right: 0, 
            zIndex: 9999, 
            padding: '10px', 
            backgroundColor: '#ff4444', 
            color: 'white', 
            textAlign: 'center',
            fontSize: '14px' 
          }}
        >
          ⚠️ Google Maps APIキーが設定されていません
        </div>
      )}
      
      {children}
    </>
  );
}