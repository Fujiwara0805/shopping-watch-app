"use client";

// Scriptコンポーネントのインポートと使用を削除
// import Script from "next/script";

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* 
        <Script
          src={`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&libraries=places&loading=async`}
          strategy="lazyOnload"
        /> 
      */}
      {children}
    </>
  );
}