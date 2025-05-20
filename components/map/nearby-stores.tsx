"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, AlertTriangle, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { StoreCard } from '@/components/map/store-card';
import { Store } from '@/types/store';
import { useGeolocation } from '@/lib/hooks/use-geolocation';

declare global {
  interface Window {
    google: any;
  }
}

const CATEGORIES = [
  { key: 'supermarket', label: 'スーパー' },
  { key: 'convenience_store', label: 'コンビニ' },
  { key: 'department_store', label: 'デパート' },
  { key: 'shopping_mall', label: 'モール' },
];

const ITEMS_PER_PAGE = 5;
const MAX_PAGE_FETCHES = 3;

export function NearbyStores() {
  const [searchTerm, setSearchTerm] = useState('');
  const [fetchedStores, setFetchedStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleMapsApiLoaded, setGoogleMapsApiLoaded] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { 
    latitude, 
    longitude, 
    loading: locationLoading, 
    error: locationError, 
    permissionState, 
    requestLocation 
  } = useGeolocation();

  const [favoritePlaceIds, setFavoritePlaceIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const savedFavorites = localStorage.getItem('favoritePlaceIds');
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('favoritePlaceIds', JSON.stringify(favoritePlaceIds));
    }
  }, [favoritePlaceIds]);

  const toggleFavorite = (storeId: string) => {
    setFavoritePlaceIds(prev =>
      prev.includes(storeId)
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  useEffect(() => {
    const checkGoogleApi = () => {
      if (typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
        setGoogleMapsApiLoaded(true);
      } else {
        setTimeout(checkGoogleApi, 200);
      }
    };
    if (typeof window !== 'undefined') {
      checkGoogleApi();
    }
  }, []);

  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const allFetchedStoresRef = useRef<Store[]>([]);
  const fetchAttemptCountRef = useRef<number>(0);

  const handleSearchResponse = useCallback((
    results: google.maps.places.PlaceResult[] | null,
    status: google.maps.places.PlacesServiceStatus,
    pagination: google.maps.places.PlaceSearchPagination | null
  ) => {
    if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
      console.log(`NearbyStores: Page ${fetchAttemptCountRef.current} successful. API returned results count: ${results.length}`);
      results.forEach((place, index) => {
        console.log(`NearbyStores: Result ${index + 1}: Name: ${place.name}, Types: ${place.types?.join(', ')}, Vicinity: ${place.vicinity}`);
      });

      const newStores: Store[] = results.map(place => {
        return {
          id: place.place_id || `temp-id-${Math.random()}`,
          name: place.name || '名称不明',
          address: place.vicinity || place.formatted_address || '住所不明',
          latitude: place.geometry?.location?.lat() || 0,
          longitude: place.geometry?.location?.lng() || 0,
          types: place.types || [],
          icon: place.icon,
          rating: place.rating,
          user_ratings_total: place.user_ratings_total,
          hasDiscount: false,
          phone: '',
          website: place.website || '',
          photos: place.photos?.map(p => p.getUrl({ maxWidth: 400, maxHeight: 400 })) || [],
          posts: 0,
        };
      });
      allFetchedStoresRef.current = [...allFetchedStoresRef.current, ...newStores];
      setFetchedStores([...allFetchedStoresRef.current]);

      if (pagination && pagination.hasNextPage && fetchAttemptCountRef.current < MAX_PAGE_FETCHES) {
        fetchAttemptCountRef.current++;
        console.log(`NearbyStores: More pages available. Fetching next page (${fetchAttemptCountRef.current}).`);
        setTimeout(() => {
          if (pagination && typeof pagination.nextPage === 'function') {
             pagination.nextPage();
          } else {
             console.warn("NearbyStores: pagination.nextPage is not available when trying to fetch next page.");
             setIsLoading(false);
          }
        }, 300);
      } else {
        setIsLoading(false);
        if (allFetchedStoresRef.current.length === 0) {
          setError("周辺に該当する店舗が見つかりませんでした。");
        }
        console.log("NearbyStores: All pages fetched or max fetches reached. Total stores:", allFetchedStoresRef.current.length);
      }
    } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS && fetchAttemptCountRef.current === 1) {
      console.log("NearbyStores: No results found on initial search.");
      setFetchedStores([]);
      setError("周辺に該当する店舗が見つかりませんでした。");
      setIsLoading(false);
    } else if (status !== window.google.maps.places.PlacesServiceStatus.OK) {
      console.error(`NearbyStores: Nearby search failed on page ${fetchAttemptCountRef.current}. Status:`, status);
      setError(`店舗の検索に失敗しました: ${status}`);
      if (fetchAttemptCountRef.current === 1 || !pagination || !pagination.hasNextPage) {
           setIsLoading(false);
      }
    } else {
       console.warn("NearbyStores: Search status OK but no results or unexpected situation.", status, results);
       if (fetchAttemptCountRef.current === 1 || !pagination || !pagination.hasNextPage) {
           setIsLoading(false);
       }
    }
  }, [setFetchedStores, setIsLoading, setError]);

  const performNearbySearch = useCallback(async () => {
    if (!googleMapsApiLoaded || !latitude || !longitude || permissionState !== 'granted') {
      if (permissionState !== 'granted' && permissionState !== 'prompt' && permissionState !== 'pending') {
         setError("位置情報の利用が許可されていません。");
      }
      return;
    }

    setIsLoading(true);
    setError(null);
    setFetchedStores([]);
    allFetchedStoresRef.current = [];
    fetchAttemptCountRef.current = 0;

    fetchAttemptCountRef.current = 1;
    console.log("NearbyStores: Performing initial nearby search (Page 1) with lat:", latitude, "lng:", longitude);

    if (!placesServiceRef.current && typeof window.google !== 'undefined' && window.google.maps && window.google.maps.places) {
      const mapDivForService = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(mapDivForService);
    }
    
    const request: google.maps.places.PlaceSearchRequest = {
      location: new window.google.maps.LatLng(latitude, longitude),
      radius: 100,
      keyword: 'スーパーマーケット OR コンビニエンスストア OR デパート OR ショッピングモール OR 小売店',
    };

    if (placesServiceRef.current) {
      placesServiceRef.current.nearbySearch(request, handleSearchResponse);
    } else {
      console.error("NearbyStores: PlacesService is not initialized.");
      setIsLoading(false);
      setError("店舗検索サービスの初期化に失敗しました。");
    }
  }, [googleMapsApiLoaded, latitude, longitude, permissionState, handleSearchResponse]);

  useEffect(() => {
    console.log("NearbyStores: useEffect for performNearbySearch triggered. Deps met?", { latitude, longitude, permissionState, googleMapsApiLoaded, locationLoading });
    if (latitude && longitude && permissionState === 'granted' && googleMapsApiLoaded && !locationLoading) {
      performNearbySearch();
    }
  }, [latitude, longitude, permissionState, googleMapsApiLoaded, locationLoading, performNearbySearch]);

  useEffect(() => {
    if (permissionState === 'granted' && !latitude && !longitude && !locationLoading && !error) {
      console.log("NearbyStores: Permission granted, but no coords yet & not loading. Requesting location.");
      requestLocation();
    }
  }, [permissionState, latitude, longitude, locationLoading, requestLocation, error]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  const categoryFilteredStores = fetchedStores.filter(store => {
    if (!selectedCategory) return true;
    return store.types?.includes(selectedCategory);
  });

  const searchFilteredStores = categoryFilteredStores.filter(store => 
    store.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (store.address && store.address.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(searchFilteredStores.length / ITEMS_PER_PAGE);
  const paginatedStores = searchFilteredStores.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (!googleMapsApiLoaded || locationLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">読み込み中...</p>
      </div>
    );
  }

  if (permissionState !== 'granted') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-4 text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-semibold mb-2">位置情報の利用が必要です</h3>
        <p className="text-muted-foreground mb-4">
          {permissionState === 'denied' 
            ? "位置情報の利用が拒否されています。ブラウザまたは端末の設定で許可してください。"
            : "現在地周辺の店舗を表示するには、位置情報の利用を許可してください。"}
        </p>
        {(permissionState === 'prompt' || permissionState === 'pending') &&
            <Button onClick={requestLocation}>位置情報の利用を許可する</Button>
        }
      </div>
    );
  }
  
  if (locationError) {
      return <div className="flex items-center justify-center h-full p-4 text-destructive">エラー: {locationError}</div>;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="店舗名や住所で検索（現在地周辺）"
            className="pl-9"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2 mb-1">
          <Button
            variant={selectedCategory === null ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            className="text-xs h-7 px-2"
          >
            すべて
          </Button>
          {CATEGORIES.map(category => (
            <Button
              key={category.key}
              variant={selectedCategory === category.key ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category.key)}
              className="text-xs h-7 px-2"
            >
              {category.label}
            </Button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 pt-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="ml-2 text-muted-foreground">店舗を検索中...</p>
          </div>
        )}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
            <p className="text-destructive">{error}</p>
            <Button variant="link" onClick={performNearbySearch} className="mt-2">再試行</Button>
          </div>
        )}
        {!isLoading && !error && (
          <AnimatePresence initial={false}>
            {paginatedStores.length > 0 ? (
              <motion.div className="space-y-3">
                {paginatedStores.map((store, index) => (
                  <motion.div
                    key={store.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.25, delay: index * 0.04 }}
                  >
                    <StoreCard 
                      store={store} 
                      isFavorite={favoritePlaceIds.includes(store.id)}
                      onToggleFavorite={() => toggleFavorite(store.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full py-8 text-center"
              >
                <p className="text-muted-foreground">
                  {searchTerm ? "検索結果がありません" : "現在地周辺に店舗が見つかりませんでした。"}
                </p>
                {searchTerm && (
                  <Button 
                    variant="link" 
                    onClick={() => setSearchTerm('')}
                    className="mt-2"
                  >
                    検索をリセット
                  </Button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
        {!isLoading && !error && searchFilteredStores.length > 12 && (
          <div className="p-4 border-t flex justify-center items-center space-x-2">
            <Button 
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              前へ
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentPage} / {totalPages}
            </span>
            <Button 
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              次へ
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}