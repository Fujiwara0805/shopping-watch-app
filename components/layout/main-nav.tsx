"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Home, MapPin, PlusCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    name: "タイムライン",
    href: "/timeline",
    icon: Home,
  },
  {
    name: "お店を探す",
    href: "/map",
    icon: MapPin,
  },
  {
    name: "投稿する",
    href: "/post",
    icon: PlusCircle,
  },
  {
    name: "マイページ",
    href: "/profile",
    icon: User,
  },
];

export function MainNav() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  useEffect(() => {
    // ログイン状態のチェックは残しても良いが、リダイレクトは行わないようにする
    setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
  }, []);
  
  const handlePostClick = (e: React.MouseEvent) => {
    /*
    if (!isLoggedIn) {
      e.preventDefault();
      window.location.href = '/login';
    }
    */
  };

  return (
    <nav 
      className="bg-background border-t border-border"
      style={{
        // 🔥 完全固定ナビゲーション（画面ずれ防止）
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999, // Google Places より高い z-index
        width: '100%',
        height: '64px', // 高さを明示的に指定
        // 🔥 Chrome/Safari統一のセーフエリア対応
        paddingBottom: 'max(0px, env(safe-area-inset-bottom, 0px))',
        // 🔥 背景を確実に表示
        backgroundColor: 'hsl(var(--background))',
        borderTop: '1px solid hsl(var(--border))',
        // 🔥 画面ずれ防止のための追加設定
        transform: 'translateZ(0)', // ハードウェアアクセラレーション
        backfaceVisibility: 'hidden', // 描画最適化
      }}
    >
      {/* 🔥 Chrome余白問題解決：セーフエリアパディング完全削除 */}
      <div 
        className="flex justify-around items-center"
        style={{
          height: '64px', // ナビゲーション本体の高さ
          width: '100%',
        }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={item.href === '/post' ? handlePostClick : undefined}
              className={cn(
                "flex flex-col items-center justify-center w-full h-full relative",
                "transition-colors duration-200",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <div className="relative">
                <item.icon className="h-6 w-6" />
                {isActive && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"
                    transition={{ duration: 0.3 }}
                  />
                )}
              </div>
              <span className="text-xs mt-1">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}