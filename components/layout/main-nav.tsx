"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Newspaper, MapPin, User, ShoppingBag } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    name: "おとく板",
    href: "/timeline",
    icon: Newspaper,
  },
  {
    name: "買い物メモ",
    href: "/memo",
    icon: ShoppingBag,
  },
  {
    name: "お店を探す",
    href: "/map",
    icon: MapPin,
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
  
  // 削除: handlePostClick関数は不要
  
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-10 bg-background border-t border-border pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
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