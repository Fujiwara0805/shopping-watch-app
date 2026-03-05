"use client";

import { useCallback, useRef } from 'react';

interface PlacePhotoEntry {
  photoUrl: string | null;
}

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 200;

/**
 * Google Places API を使ってスポットの写真を取得するフック。
 * nearbySearch + keyword でファジーマッチングし、日本語スポット名にも強い。
 * セッション内キャッシュ（ネガティブキャッシュ含む）で重複リクエストを防止する。
 */
export function usePlacePhotos() {
  const cacheRef = useRef<Map<string, PlacePhotoEntry>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());

  const lookupPhoto = useCallback((
    map: google.maps.Map,
    spotId: string,
    spotName: string,
    spotLat: number,
    spotLng: number,
  ): Promise<string | null> => {
    // Return cached result
    if (cacheRef.current.has(spotId)) {
      return Promise.resolve(cacheRef.current.get(spotId)!.photoUrl);
    }
    // Skip if already pending
    if (pendingRef.current.has(spotId)) {
      return Promise.resolve(null);
    }
    pendingRef.current.add(spotId);

    return new Promise((resolve) => {
      try {
        const service = new google.maps.places.PlacesService(map);
        const location = new google.maps.LatLng(spotLat, spotLng);

        // nearbySearch: keyword でファジーマッチング + 狭い半径(200m)で位置精度を確保
        service.nearbySearch(
          {
            location,
            radius: 200,
            keyword: spotName,
          },
          (results, status) => {
            pendingRef.current.delete(spotId);

            if (
              status === google.maps.places.PlacesServiceStatus.OK &&
              results &&
              results.length > 0
            ) {
              // 最初のresultから写真を取得（距離が近い順に返される）
              const photos = results[0].photos;
              if (photos && photos.length > 0) {
                const photoUrl = photos[0].getUrl({ maxWidth: 100, maxHeight: 100 });
                cacheRef.current.set(spotId, { photoUrl });
                resolve(photoUrl);
                return;
              }

              // 最初の結果に写真がなければ、2番目以降も試す
              for (let i = 1; i < Math.min(results.length, 3); i++) {
                const altPhotos = results[i].photos;
                if (altPhotos && altPhotos.length > 0) {
                  const photoUrl = altPhotos[0].getUrl({ maxWidth: 100, maxHeight: 100 });
                  cacheRef.current.set(spotId, { photoUrl });
                  resolve(photoUrl);
                  return;
                }
              }
            }

            // ZERO_RESULTS の場合、半径を広げて再検索（500m）
            if (
              status === google.maps.places.PlacesServiceStatus.ZERO_RESULTS ||
              (status === google.maps.places.PlacesServiceStatus.OK && (!results || results.length === 0))
            ) {
              service.nearbySearch(
                {
                  location,
                  radius: 500,
                  keyword: spotName,
                },
                (retryResults, retryStatus) => {
                  if (
                    retryStatus === google.maps.places.PlacesServiceStatus.OK &&
                    retryResults &&
                    retryResults.length > 0
                  ) {
                    for (let i = 0; i < Math.min(retryResults.length, 3); i++) {
                      const photos = retryResults[i].photos;
                      if (photos && photos.length > 0) {
                        const photoUrl = photos[0].getUrl({ maxWidth: 100, maxHeight: 100 });
                        cacheRef.current.set(spotId, { photoUrl });
                        resolve(photoUrl);
                        return;
                      }
                    }
                  }
                  // No photo found after retry - cache negative result
                  cacheRef.current.set(spotId, { photoUrl: null });
                  resolve(null);
                },
              );
              return;
            }

            // No photo found - cache negative result
            cacheRef.current.set(spotId, { photoUrl: null });
            resolve(null);
          },
        );
      } catch {
        pendingRef.current.delete(spotId);
        cacheRef.current.set(spotId, { photoUrl: null });
        resolve(null);
      }
    });
  }, []);

  /**
   * スポット配列の写真を一括で検索する（バッチ処理、レート制御付き）。
   * 各スポットの写真URLが見つかったらコールバックを呼ぶ。
   */
  const lookupPhotosInBatches = useCallback(async (
    map: google.maps.Map,
    spots: Array<{ id: string; name: string; lat: number; lng: number }>,
    onPhotoFound: (spotId: string, photoUrl: string) => void,
  ) => {
    for (let i = 0; i < spots.length; i += BATCH_SIZE) {
      const batch = spots.slice(i, i + BATCH_SIZE);
      await Promise.allSettled(
        batch.map(async (spot) => {
          const photoUrl = await lookupPhoto(map, spot.id, spot.name, spot.lat, spot.lng);
          if (photoUrl) {
            onPhotoFound(spot.id, photoUrl);
          }
        }),
      );
      // Rate limit: wait between batches
      if (i + BATCH_SIZE < spots.length) {
        await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
      }
    }
  }, [lookupPhoto]);

  return { lookupPhoto, lookupPhotosInBatches };
}
