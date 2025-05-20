'use client';

import { useState, useEffect } from 'react';
import { useInView } from 'react-intersection-observer';

interface UseInfiniteScrollProps<T> {
  initialData: T[];
  pageSize?: number;
  threshold?: number;
}

export function useInfiniteScroll<T>({
  initialData,
  pageSize = 10,
  threshold = 0.5,
}: UseInfiniteScrollProps<T>) {
  const [data, setData] = useState<T[]>(initialData);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const { ref, inView } = useInView({
    threshold,
  });

  useEffect(() => {
    if (inView && hasMore && !loading) {
      loadMore();
    }
  }, [inView]);

  const loadMore = async () => {
    setLoading(true);
    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const start = page * pageSize;
      const end = start + pageSize;
      const newItems = initialData.slice(start, end);
      
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setData(prev => [...prev, ...newItems]);
        setPage(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error loading more items:', error);
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    hasMore,
    loadMoreRef: ref,
  };
}