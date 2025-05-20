import { ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'white';
  withText?: boolean;
}

export function Logo({ 
  size = 'medium', 
  color = 'primary',
  withText = false
}: LogoProps) {
  const sizeMap = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-20 h-20',
  };
  
  const textSizeMap = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-xl',
  };
  
  const colorMap = {
    primary: 'text-primary bg-primary-foreground',
    white: 'text-white',
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className={cn(
        "rounded-full flex items-center justify-center p-2",
        colorMap[color] === 'text-white' ? 'bg-primary/80' : 'bg-primary/10',
        sizeMap[size]
      )}>
        <ShoppingCart 
          className={cn(
            colorMap[color],
            size === 'small' ? 'w-4 h-4' : size === 'medium' ? 'w-6 h-6' : 'w-10 h-10'
          )} 
        />
      </div>
      {withText && (
        <span className={cn(
          "font-bold", 
          colorMap[color],
          textSizeMap[size]
        )}>
          お惣菜ウォッチャー
        </span>
      )}
    </div>
  );
}