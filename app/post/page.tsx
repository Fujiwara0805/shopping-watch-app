"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Camera, Upload, X } from 'lucide-react';
import AppLayout from '@/components/layout/app-layout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { mockStores } from '@/lib/mock-data';
import { cn } from '@/lib/utils';

const postSchema = z.object({
  storeId: z.string({ required_error: 'お店を選択してください' }),
  category: z.string({ required_error: 'カテゴリを選択してください' }),
  content: z.string().min(5, { message: '5文字以上入力してください' }).max(200, { message: '200文字以内で入力してください' }),
  discountRate: z.number().min(10, { message: '10%以上で入力してください' }).max(90, { message: '90%以下で入力してください' }),
  expiryTime: z.string().optional(),
  remainingItems: z.string().optional(),
});

type PostFormValues = z.infer<typeof postSchema>;

export default function PostPage() {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    if (!isLoggedIn) {
      router.push('/login');
    }
  }, [router]);
  
  const form = useForm<PostFormValues>({
    resolver: zodResolver(postSchema),
    defaultValues: {
      storeId: '',
      category: '',
      content: '',
      discountRate: 30,
      expiryTime: '',
      remainingItems: '',
    },
  });
  
  const onSubmit = (values: PostFormValues) => {
    console.log({ ...values, image: imageSrc });
    
    // In a real app, we'd save this to a database
    // For demo purposes, we'll just navigate back to the timeline
    setTimeout(() => {
      router.push('/timeline');
    }, 1000);
  };
  
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // In a real app, we'd upload this to a server
      // For demo purposes, we'll just use a local URL
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const removeImage = () => {
    setImageSrc(null);
  };

  return (
    <AppLayout>
      <div className="p-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="storeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>お店</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="お店を選択してください" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>カテゴリ</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="grid grid-cols-3 gap-2"
                    >
                      {['惣菜', '弁当', '肉', '魚', '野菜', '果物', 'その他'].map((category) => (
                        <div key={category}>
                          <RadioGroupItem
                            value={category}
                            id={`category-${category}`}
                            className="peer sr-only"
                          />
                          <Label
                            htmlFor={`category-${category}`}
                            className={cn(
                              "flex flex-col items-center justify-between rounded-md border-2 border-muted p-3",
                              "hover:border-primary peer-data-[state=checked]:border-primary",
                              "peer-data-[state=checked]:bg-primary/10"
                            )}
                          >
                            {category}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>内容</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="値引き内容や商品の状態を入力してください"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-2">
              <Label>写真 (任意)</Label>
              <div className="border-2 border-dashed rounded-md p-4 text-center">
                {imageSrc ? (
                  <div className="relative">
                    <img
                      src={imageSrc}
                      alt="商品の写真"
                      className="mx-auto h-48 object-cover rounded-md"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="py-4">
                    <Camera className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      写真をアップロードしてください
                    </p>
                    <div className="flex justify-center gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        className="relative"
                      >
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <Upload className="h-4 w-4 mr-1" />
                        アップロード
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="discountRate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>値引き率: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      min={10}
                      max={90}
                      step={5}
                      value={[field.value]}
                      onValueChange={(vals) => field.onChange(vals[0])}
                      className="py-4"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="expiryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>消費期限 (任意)</FormLabel>
                    <FormControl>
                      <Input 
                        type="time"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="remainingItems"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>残り数量 (任意)</FormLabel>
                    <FormControl>
                      <div className="flex">
                        <Input
                          type="number"
                          min="1"
                          placeholder="10"
                          {...field}
                        />
                        <span className="ml-2 flex items-center text-muted-foreground">点</span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <motion.div
              whileTap={{ scale: 0.98 }}
            >
              <Button type="submit" className="w-full mt-6">
                投稿する
              </Button>
            </motion.div>
          </form>
        </Form>
      </div>
    </AppLayout>
  );
}