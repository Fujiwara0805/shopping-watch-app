import { Star } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Store } from '@/types/store';

interface StoreCardProps {
  store: Store;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function StoreCard({ store, isFavorite, onToggleFavorite }: StoreCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base">{store.name}</h3>
              {store.hasDiscount && (
                <Badge variant="secondary" className="bg-accent text-white">
                  値引き中
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground mt-1">
              {store.address}
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              {/* store.distance の表示は前回削除済み */}
              
              {/* {store.openStatus === 'open' ? ( <Badge>...</Badge> ) : ( <Badge>...</Badge> )} を削除 */}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8",
              isFavorite ? "text-yellow-500" : "text-muted-foreground"
            )}
            onClick={onToggleFavorite}
          >
            <Star className="h-5 w-5 fill-current" />
          </Button>
        </div>
        
        {store.posts > 0 && (
          <div className="mt-2 pt-2 border-t text-sm">
            <span className="text-accent font-medium">{store.posts}件</span>
            の値引き情報があります
          </div>
        )}
      </CardContent>
    </Card>
  );
}