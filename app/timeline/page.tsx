"use client";

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '@/components/layout/app-layout';
import { PostCard } from '@/components/posts/post-card';
import { PostFilter } from '@/components/posts/post-filter';
import { Skeleton } from '@/components/ui/skeleton';
import { mockPosts } from '@/lib/mock-data';
import { Post } from '@/types/post';

export default function Timeline() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  
  useEffect(() => {
    // Simulate data loading
    const loadData = setTimeout(() => {
      setPosts(mockPosts);
      setLoading(false);
    }, 1000);
    
    return () => clearTimeout(loadData);
  }, []);
  
  const filteredPosts = posts.filter(post => {
    if (activeFilter === 'all') return true;
    return post.category === activeFilter;
  });

  return (
    <AppLayout>
      <div className="p-4">
        <PostFilter activeFilter={activeFilter} setActiveFilter={setActiveFilter} />
        
        <div className="space-y-4 mt-4">
          {loading ? (
            // Skeleton loaders for posts
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="mb-4">
                <Skeleton className="h-[200px] w-full rounded-lg" />
              </div>
            ))
          ) : (
            <AnimatePresence initial={false}>
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <PostCard post={post} />
                  </motion.div>
                ))
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-8 text-center"
                >
                  <p className="text-muted-foreground">投稿がありません</p>
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </AppLayout>
  );
}