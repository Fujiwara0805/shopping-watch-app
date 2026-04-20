import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const AUTO_LOADING_MIN_MS = 500;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading,
      onClick,
      disabled,
      children,
      type,
      ...props
    },
    ref
  ) => {
    const [autoLoading, setAutoLoading] = React.useState(false);
    const mountedRef = React.useRef(true);

    React.useEffect(() => {
      mountedRef.current = true;
      return () => {
        mountedRef.current = false;
      };
    }, []);

    const isLoading = loading || autoLoading;

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isLoading || disabled) {
          e.preventDefault();
          return;
        }

        // type="submit" ではクリック直後の autoLoading で disabled 化・子の差し替えが走り、
        // ブラウザのフォーム既定送信が発火しないことがある（例: 新規投稿の「投稿する」）。
        if (type === 'submit') {
          onClick?.(e);
          return;
        }

        setAutoLoading(true);
        const minDelay = new Promise<void>((r) => setTimeout(r, AUTO_LOADING_MIN_MS));
        let result: unknown;
        if (onClick) {
          try {
            result = onClick(e);
          } catch (err) {
            setAutoLoading(false);
            throw err;
          }
        }

        const settle = () => {
          if (mountedRef.current) setAutoLoading(false);
        };

        if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
          Promise.all([result as PromiseLike<unknown>, minDelay]).then(settle, settle);
        } else {
          minDelay.then(settle);
        }
      },
      [onClick, isLoading, disabled, type]
    );

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          onClick={onClick}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <button
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...props}
      >
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
