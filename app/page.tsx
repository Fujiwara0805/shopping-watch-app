'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Menu, X, ChevronRight, Calendar, LogOut, Compass, ExternalLink, Sparkles, MessageSquare, Home as HomeIcon, Search, BookOpen, Gift, Trophy } from 'lucide-react';
import { generateSemanticEventUrl } from '@/lib/seo/url-helper';
import { Button } from '@/components/ui/button';
import { useSession, signOut } from 'next-auth/react';
import { NoteArticlesSection } from '@/components/external-content';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { designTokens, OITA_MUNICIPALITIES, TARGET_AUDIENCE_OPTIONS } from '@/lib/constants';
import { trackEvent } from '@/lib/services/analytics';
import { useFeedback } from '@/lib/contexts/feedback-context';
import { FeedbackModal } from '@/components/feedback/feedback-modal';
import { supabase } from '@/lib/supabaseClient';

// ===================================================================
// TYPE DEFINITIONS
// ===================================================================

interface Announcement {
  date: string;
  title: string;
}

interface ShowcaseEvent {
  id: string;
  event_name: string;
  store_name: string;
  city: string | null;
  image_url: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
}

// ===================================================================
// SECTION HEADER (App-style)
// ===================================================================

const AppSectionHeader = ({
  label,
  title,
  rightAction,
  light = false,
}: {
  label: string;
  title: string;
  rightAction?: { text: string; onClick: () => void };
  light?: boolean;
}) => (
  <div className="flex items-end justify-between mb-6 sm:mb-8">
    <div>
      <span
        className="block text-xs font-bold tracking-[0.25em] uppercase mb-2"
        style={{ color: designTokens.colors.accent.gold }}
      >
        {label}
      </span>
      <h2
        className="text-xl sm:text-2xl md:text-4xl font-bold leading-tight"
        style={{
          fontFamily: designTokens.typography.display,
          color: light ? '#FFFFFF' : designTokens.colors.text.primary,
        }}
      >
        {title}
      </h2>
    </div>
    {rightAction && (
      <button
        onClick={rightAction.onClick}
        className="flex items-center gap-1 text-sm font-semibold flex-shrink-0 ml-4"
        style={{ color: light ? 'rgba(255,255,255,0.7)' : designTokens.colors.primary.base }}
      >
        {rightAction.text}
        <ChevronRight className="w-4 h-4" />
      </button>
    )}
  </div>
);

// ===================================================================
// ELEVATION CARD
// ===================================================================

const ElevationCard = ({
  children,
  className = '',
  elevation = 'medium',
  hover = true,
  padding = 'lg',
  style: styleOverride,
}: {
  children: React.ReactNode;
  className?: string;
  elevation?: 'subtle' | 'low' | 'medium' | 'high';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  style?: React.CSSProperties;
}) => {
  const paddingMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8', xl: 'p-10' };
  return (
    <div
      className={`relative rounded-3xl overflow-hidden ${paddingMap[padding]} ${hover ? 'transition-shadow duration-300 hover:shadow-xl' : ''} ${className}`}
      style={{
        background: designTokens.colors.background.white,
        boxShadow: designTokens.elevation[elevation],
        border: `1px solid ${designTokens.colors.secondary.stone}20`,
        ...styleOverride,
      }}
    >
      {children}
    </div>
  );
};

// ===================================================================
// HEADER NAVIGATION (App-style)
// ===================================================================

const Header = ({ isScrolled, onFeedbackOpen, onMenuOpen }: { isScrolled: boolean; onFeedbackOpen: () => void; onMenuOpen: () => void }) => {
  const router = useRouter();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        background: isScrolled ? `rgba(244,245,242,0.85)` : 'transparent',
        backdropFilter: isScrolled ? 'blur(24px)' : 'none',
        WebkitBackdropFilter: isScrolled ? 'blur(24px)' : 'none',
        borderBottom: isScrolled ? `1px solid ${designTokens.colors.secondary.stone}30` : 'none',
      }}
    >
      <div className="container mx-auto px-5 h-14 sm:h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2">
          <span
            className="font-bold text-lg tracking-wider"
            style={{
              fontFamily: designTokens.typography.display,
              color: isScrolled ? designTokens.colors.primary.base : '#FFFFFF',
            }}
          >
            TOKU<span style={{ color: designTokens.colors.accent.gold }}>DOKU</span>
          </span>
        </a>
        <div className="hidden md:flex items-center gap-6">
          {[
            { label: 'イベント', href: '/events' },
            { label: '地図で探す', href: '/map' },
            { label: 'お問い合わせ', href: '/contact' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: isScrolled ? designTokens.colors.text.secondary : 'rgba(255,255,255,0.85)' }}
            >
              {link.label}
            </a>
          ))}
          <button
            onClick={onMenuOpen}
            className="p-2 rounded-xl transition-colors hover:opacity-70"
            style={{ color: isScrolled ? designTokens.colors.primary.base : '#FFFFFF' }}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

// ===================================================================
// SIDE MENU (Shared mobile/desktop)
// ===================================================================

const SideMenu = ({ isOpen, onClose, onFeedbackOpen }: { isOpen: boolean; onClose: () => void; onFeedbackOpen: () => void }) => {
  const { data: session } = useSession();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[60]"
            style={{ background: `${designTokens.colors.primary.base}40`, backdropFilter: 'blur(4px)' }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-80 shadow-2xl z-[70] overflow-y-auto"
            style={{ background: designTokens.colors.background.white }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-8">
                <span className="font-semibold text-lg" style={{ color: designTokens.colors.primary.base }}>
                  Menu
                </span>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                  style={{ color: designTokens.colors.primary.base }}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <nav className="space-y-1">
                {[
                  { href: '/profile', label: 'マイページ' },
                  { href: '/events', label: 'イベント一覧' },
                  { href: '/map', label: '地図で探す' },
                  { href: '/terms/terms-of-service', label: '利用規約' },
                  { href: '/terms/privacy-policy', label: 'プライバシーポリシー' },
                  { href: '/contact', label: 'お問い合わせ' },
                  { href: '/release-notes', label: 'リリースノート' },
                ].map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    className="block px-4 py-3 rounded-xl font-medium transition-colors hover:bg-gray-50"
                    style={{ color: designTokens.colors.text.secondary }}
                    onClick={onClose}
                  >
                    {item.label}
                  </a>
                ))}
                <button
                  onClick={() => { onClose(); onFeedbackOpen(); }}
                  className="flex items-center w-full px-4 py-3 rounded-xl font-medium hover:bg-gray-50"
                  style={{ color: designTokens.colors.accent.lilacDark }}
                >
                  <MessageSquare className="h-5 w-5 mr-2" />
                  ご意見
                </button>
                {session && (
                  <button
                    onClick={async () => { onClose(); await signOut({ callbackUrl: '/' }); }}
                    className="flex items-center w-full px-4 py-3 rounded-xl font-medium mt-4 hover:bg-gray-50"
                    style={{ color: designTokens.colors.functional.error }}
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    ログアウト
                  </button>
                )}
              </nav>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ===================================================================
// BOTTOM TAB NAV (Mobile App Pattern)
// ===================================================================

const BottomTabNav = ({
  onMapClick,
  onMenuOpen,
}: {
  onMapClick: () => void;
  onMenuOpen: () => void;
}) => {
  const router = useRouter();

  const tabs = [
    { icon: HomeIcon, label: 'ホーム', action: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { icon: Calendar, label: 'イベント', action: () => router.push('/events') },
    { icon: Compass, label: '地図', action: onMapClick, accent: true },
    { icon: BookOpen, label: '記事', action: () => window.open('https://note.com/kind_ixora3833', '_blank') },
    { icon: Menu, label: 'メニュー', action: onMenuOpen },
  ];

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: `1px solid ${designTokens.colors.secondary.stone}30`,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around h-16">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            onClick={tab.action}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 py-1 transition-colors"
          >
            {tab.accent ? (
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center -mt-5 shadow-lg"
                style={{ background: designTokens.colors.accent.gold }}
              >
                <tab.icon className="w-5 h-5" style={{ color: designTokens.colors.text.primary }} />
              </div>
            ) : (
              <tab.icon className="w-5 h-5" style={{ color: designTokens.colors.text.muted }} />
            )}
            <span
              className="text-[10px] font-semibold"
              style={{ color: tab.accent ? designTokens.colors.accent.goldDark : designTokens.colors.text.muted }}
            >
              {tab.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

// ===================================================================
// HERO SECTION (Roadtrippers-style: bottom-aligned, immersive)
// ===================================================================

const HERO_BG_IMAGES = [
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_1200/v1772416996/Gemini_Generated_Image_n5dwvwn5dwvwn5dw_nq711a_c_pad_b_gen_fill_w_1024_h_1024_ampt7h.png',
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_1200/v1772416995/Gemini_Generated_Image_sauq56sauq56sauq_bgou7c_c_pad_b_gen_fill_w_1024_h_1024_dlmpvb.png',
  'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_1200/v1772416995/Gemini_Generated_Image_tgqneqtgqneqtgqn_ekswrm_c_pad_b_gen_fill_w_1024_h_1024_vyp6lv.png',
];

const HeroSection = ({
  onStart,
  onEventSearch,
  city,
  setCity,
  target,
  setTarget,
}: {
  onStart: () => void;
  onEventSearch: (params: { city: string; target: string }) => void;
  city: string;
  setCity: (v: string) => void;
  target: string;
  setTarget: (v: string) => void;
}) => {
  const [currentBgIndex, setCurrentBgIndex] = useState(0);
  const [showSearchExpanded, setShowSearchExpanded] = useState(false);

  // Background rotation: 8s interval (reduced CPU from 5s), no parallax
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex(prev => (prev + 1) % HERO_BG_IMAGES.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-end overflow-hidden">
      {/* Background — CSS-only crossfade, no framer-motion */}
      <div className="absolute inset-0 z-0">
        {HERO_BG_IMAGES.map((url, i) => (
          <div
            key={i}
            className="absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000 ease-in-out"
            style={{
              backgroundImage: `url(${url})`,
              backgroundPosition: 'center 30%',
              opacity: i === currentBgIndex ? 1 : 0,
            }}
          />
        ))}
        <div
          className="absolute inset-0"
          style={{
            background: 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.1) 40%, rgba(0,0,0,0.55) 100%)',
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 w-full px-5 pb-12 sm:pb-16 md:pb-20 pt-28 animate-fade-in-up">
        <div className="container mx-auto max-w-5xl">
          <p
            className="text-sm sm:text-base font-medium mb-4"
            style={{ color: 'rgba(255,255,255,0.75)' }}
          >
            Oita Event Guide
          </p>

          <h1
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.2] tracking-tight mb-6"
            style={{
              fontFamily: designTokens.typography.display,
              color: '#FFFFFF',
              textShadow: '0 2px 16px rgba(0,0,0,0.3)',
            }}
          >
            大分県内のイベントを探して、
            <br className="md:hidden" />
            <span className="relative inline-block">
              <span className="relative z-10">地域の魅力と出会う時間へ。</span>
              <span
                className="absolute bottom-1 sm:bottom-2 left-0 right-0 h-3 sm:h-4 -z-10 rounded-sm"
                style={{ background: `${designTokens.colors.accent.gold}60` }}
              />
            </span>
          </h1>

          {/* Search Bar */}
          <div className="max-w-lg">
            <button
              onClick={() => setShowSearchExpanded(!showSearchExpanded)}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.99]"
              style={{
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
              }}
            >
              <Search className="w-5 h-5 flex-shrink-0" style={{ color: designTokens.colors.primary.base }} />
              <span className="text-sm sm:text-base font-medium" style={{ color: designTokens.colors.text.secondary }}>
                大分のイベントを探す...
              </span>
              <ChevronRight className="w-5 h-5 ml-auto flex-shrink-0" style={{ color: designTokens.colors.text.muted }} />
            </button>

            {/* Expanded search form — CSS transition instead of AnimatePresence */}
            {showSearchExpanded && (
              <div className="mt-3 animate-fade-in">
                <div
                  className="rounded-2xl p-5 space-y-4"
                  style={{
                    background: 'rgba(255,255,255,0.95)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                  }}
                >
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold" style={{ color: designTokens.colors.text.secondary }}>
                        エリア
                      </Label>
                      <Select value={city} onValueChange={setCity}>
                        <SelectTrigger className="h-11 rounded-xl text-sm" style={{ borderColor: `${designTokens.colors.secondary.stone}40` }}>
                          <SelectValue placeholder="大分県内の市町村" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="all">すべてのエリア</SelectItem>
                          {OITA_MUNICIPALITIES.map((m) => (
                            <SelectItem key={m} value={m}>{m}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold" style={{ color: designTokens.colors.text.secondary }}>
                        対象者（任意）
                      </Label>
                      <Select value={target} onValueChange={setTarget}>
                        <SelectTrigger className="h-11 rounded-xl text-sm" style={{ borderColor: `${designTokens.colors.secondary.stone}40` }}>
                          <SelectValue placeholder="指定なし" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                          {TARGET_AUDIENCE_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => { setCity('all'); setTarget('none'); }}
                      className="flex-1 h-11 rounded-xl text-sm font-medium"
                      style={{ borderColor: designTokens.colors.secondary.stone, color: designTokens.colors.text.secondary }}
                    >
                      クリア
                    </Button>
                    <Button
                      onClick={() => {
                        setShowSearchExpanded(false);
                        onEventSearch({ city: city === 'all' ? '' : city, target: target === 'none' ? '' : target });
                      }}
                      className="flex-[2] h-11 rounded-xl text-sm font-semibold"
                      style={{ background: designTokens.colors.accent.lilac, color: '#FFFFFF' }}
                    >
                      イベントを探す
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Secondary CTA */}
          <div className="mt-6 flex items-center gap-4">
            <button
              onClick={onStart}
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full font-semibold text-sm sm:text-base active:scale-[0.97] transition-transform"
              style={{
                background: designTokens.colors.accent.gold,
                color: designTokens.colors.text.primary,
                boxShadow: `0 6px 24px ${designTokens.colors.accent.gold}40`,
              }}
            >
              <MapPin className="w-4 h-4" />
              地図から探す
            </button>
            <span className="text-xs sm:text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              登録不要 ・ 無料
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};

// ===================================================================
// ANNOUNCEMENT STRIP (Horizontal scroll pills)
// ===================================================================

const announcements: Announcement[] = [
  { date: '2026.03.24', title: 'スタンプラリー機能（β版）を追加しました。イベントにGPSチェックイン機能を搭載しました。' },
  { date: '2026.03.06', title: 'トクドクがリニューアルしました! イベント検索がより便利に。' },
  { date: '2026.03.01', title: '大分県内のイベント情報を随時更新中です。' },
];

const AnnouncementSection = () => {
  const router = useRouter();

  return (
    <section
      className="py-10 sm:py-12 px-5 relative"
      style={{ background: designTokens.colors.background.white }}
    >
      <div className="container mx-auto max-w-5xl">
        <AppSectionHeader label="News" title="お知らせ" />

        <div className="space-y-3">
          {announcements.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-4 py-3 px-4 rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                background: designTokens.colors.background.mist,
                border: `1px solid ${designTokens.colors.secondary.stone}20`,
              }}
              onClick={() => router.push('/announcements')}
            >
              <span
                className="flex-shrink-0 text-xs font-bold px-3 py-1 rounded-full"
                style={{
                  background: `${designTokens.colors.accent.gold}20`,
                  color: designTokens.colors.accent.goldDark,
                }}
              >
                {item.date}
              </span>
              <span
                className="text-sm sm:text-base"
                style={{ color: designTokens.colors.text.primary, fontFamily: designTokens.typography.body }}
              >
                {item.title}
              </span>
              <ChevronRight
                className="w-4 h-4 flex-shrink-0 ml-auto"
                style={{ color: designTokens.colors.text.muted }}
              />
            </div>
          ))}
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => router.push('/announcements')}
            className="text-sm font-medium hover:opacity-70 transition-opacity inline-flex items-center gap-1"
            style={{ color: designTokens.colors.primary.base }}
          >
            すべてのお知らせを見る
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

// ===================================================================
// EVENT SHOWCASE SECTION (Horizontal snap scroll, large portrait cards)
// ===================================================================

const EventShowcaseSection = ({ onPreloadImages }: { onPreloadImages?: (urls: string[]) => void }) => {
  const router = useRouter();
  const [events, setEvents] = useState<ShowcaseEvent[]>([]);
  const [loadedImages, setLoadedImages] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchEvents = async () => {
      const now = new Date();
      const { data, error } = await supabase
        .from('posts')
        .select('id, event_name, store_name, city, image_urls, event_start_date, event_end_date')
        .eq('is_deleted', false)
        .eq('category', 'イベント情報')
        .eq('prefecture', '大分県')
        .order('event_start_date', { ascending: true });

      if (error || !data) return;

      const filtered = data.filter((event) => {
        if (event.event_end_date) {
          const endDate = new Date(event.event_end_date);
          endDate.setHours(23, 59, 59, 999);
          return now <= endDate;
        }
        if (event.event_start_date) {
          const startDate = new Date(event.event_start_date);
          startDate.setHours(23, 59, 59, 999);
          return now <= startDate;
        }
        return true;
      });

      const mapped: ShowcaseEvent[] = filtered.map((item) => {
        let imageUrl: string | null = null;
        const urls = item.image_urls;
        if (urls) {
          if (typeof urls === 'string') {
            try {
              const parsed = JSON.parse(urls);
              imageUrl = Array.isArray(parsed) && parsed.length > 0 ? parsed[0] : null;
            } catch { imageUrl = null; }
          } else if (Array.isArray(urls) && urls.length > 0) {
            imageUrl = urls[0];
          }
        }
        if (imageUrl && imageUrl.includes('cloudinary.com') && !imageUrl.includes('w_256')) {
          imageUrl = imageUrl.replace('/upload/', '/upload/f_auto,q_60,w_300,h_400,c_fill/');
        }
        return {
          id: item.id,
          event_name: item.event_name || item.store_name,
          store_name: item.store_name,
          city: item.city || null,
          image_url: imageUrl,
          event_start_date: item.event_start_date || null,
          event_end_date: item.event_end_date || null,
        };
      });

      setEvents(mapped);

      // Lightweight preload: only first 4 visible LP card images
      mapped.slice(0, 4).forEach(event => {
        if (event.image_url && !document.querySelector(`link[href="${event.image_url}"]`)) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = event.image_url;
          document.head.appendChild(link);
        }
      });
    };

    fetchEvents();
  }, []);

  if (events.length === 0) return null;

  const formatDate = (start: string | null, end: string | null) => {
    if (!start) return '';
    const s = new Date(start);
    const sStr = `${s.getMonth() + 1}/${s.getDate()}`;
    if (end && end !== start) {
      const e = new Date(end);
      return `${sStr} - ${e.getMonth() + 1}/${e.getDate()}`;
    }
    return sStr;
  };

  return (
    <section
      className="py-16 sm:py-20 relative overflow-hidden"
      style={{ background: designTokens.colors.primary.dark }}
    >
      <div className="container mx-auto max-w-6xl px-5">
        <AppSectionHeader
          label="Events"
          title="大分県内のイベントを紹介"
          rightAction={{ text: 'すべて見る', onClick: () => router.push('/area/大分県') }}
          light
        />
      </div>

      {/* Horizontal snap scroll */}
      <div className="pl-5 sm:pl-[max(1.25rem,calc((100%-72rem)/2+1.25rem))]">
        <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 pr-5">
          {events.map((event, index) => {
            const isLoaded = event.image_url ? loadedImages.has(event.id) : true;
            return (
              <div
                key={event.id}
                className="relative w-64 sm:w-72 flex-shrink-0 aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer snap-start group"
                onClick={() => {
                  const eventUrl = generateSemanticEventUrl({
                    eventId: event.id,
                    eventName: event.event_name,
                    city: event.city || undefined,
                    prefecture: '大分県',
                  });
                  router.push(eventUrl);
                }}
              >
                {/* Image */}
                {event.image_url ? (
                  <>
                    {!isLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-3xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.25)', borderTopColor: 'transparent' }} />
                      </div>
                    )}
                    <img
                      src={event.image_url}
                      alt={event.event_name}
                      className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                      loading={index < 4 ? 'eager' : 'lazy'}
                      decoding="async"
                      {...(index < 3 ? { fetchPriority: 'high' as const } : {})}
                      onLoad={() => setLoadedImages(prev => new Set(prev).add(event.id))}
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <Calendar className="h-12 w-12" style={{ color: 'rgba(255,255,255,0.2)' }} />
                  </div>
                )}

                {/* City badge */}
                {event.city && (
                  <div
                    className="absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-semibold"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      backdropFilter: 'blur(8px)',
                      color: '#FFFFFF',
                    }}
                  >
                    {event.city}
                  </div>
                )}

                {/* Bottom gradient + text */}
                <div
                  className="absolute inset-0"
                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)' }}
                />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3
                    className="font-bold text-base sm:text-lg leading-snug line-clamp-2 mb-1"
                    style={{ color: '#FFFFFF', fontFamily: designTokens.typography.display }}
                  >
                    {event.event_name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
                      {event.store_name}
                    </span>
                    {event.event_start_date && (
                      <>
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                        <span className="text-xs font-medium" style={{ color: designTokens.colors.accent.gold }}>
                          {formatDate(event.event_start_date, event.event_end_date)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

// ===================================================================
// CHALLENGES SECTION (Full-bleed story cards)
// ===================================================================

const ChallengesSection = () => {
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const challenges = [
    {
      imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_800/v1772416996/Gemini_Generated_Image_n5dwvwn5dwvwn5dw_nq711a_c_pad_b_gen_fill_w_1024_h_1024_ampt7h.png',
      title: 'イベント情報がバラバラで見つからない',
      description: '各市町村が独自に情報発信しているため、大分県全体のイベント・祭り・マルシェを一括検索できる場所がない。',
    },
    {
      imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_800/v1772416995/Gemini_Generated_Image_sauq56sauq56sauq_bgou7c_c_pad_b_gen_fill_w_1024_h_1024_dlmpvb.png',
      title: '地元のイベントを見逃してしまう',
      description: '「知っていれば行ったのに」——SNSや口コミだけでは、大分の魅力的なイベントを見つけきれない。',
    },
    {
      imageUrl: 'https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto,w_800/v1772416995/Gemini_Generated_Image_tgqneqtgqneqtgqn_ekswrm_c_pad_b_gen_fill_w_1024_h_1024_vyp6lv.png',
      title: '開催日や場所がすぐに分からない',
      description: 'いつ、どこで開催されるのか。イベントの日程や会場情報をまとめて確認できる場所がない。',
    },
  ];

  return (
    <section
      className="py-16 sm:py-20 px-5 relative"
      style={{ background: designTokens.colors.background.mist }}
    >
      <div className="container mx-auto max-w-6xl">
        <AppSectionHeader label="Challenges" title="大分のイベント情報、もっと届けたい" />

        <p
          className="text-base sm:text-lg mb-10 max-w-2xl leading-relaxed"
          style={{ fontFamily: designTokens.typography.body, color: designTokens.colors.text.secondary }}
        >
          イベント情報が各市町村に散らばり、見つけにくい現状。
          一括で探せる場所があれば、もっと届くはず。
        </p>

        {/* Mobile: Horizontal scroll, Desktop: Vertical stack */}
        <div className="flex md:flex-col gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none scrollbar-hide pb-2 md:pb-0 -mx-5 px-5 md:mx-0 md:px-0">
          {challenges.map((challenge, index) => (
            <div
              key={challenge.title}
              className="relative w-64 sm:w-72 md:w-full flex-shrink-0 snap-start rounded-3xl overflow-hidden group aspect-[3/4] md:aspect-video"
            >
              {/* Loading skeleton */}
              {!loadedImages.has(index) && (
                <div className="absolute inset-0 flex items-center justify-center rounded-3xl" style={{ background: designTokens.colors.secondary.stone + '30' }}>
                  <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${designTokens.colors.primary.light}40`, borderTopColor: 'transparent' }} />
                </div>
              )}
              <img
                src={challenge.imageUrl}
                alt=""
                className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${loadedImages.has(index) ? 'opacity-100' : 'opacity-0'}`}
                loading="lazy"
                decoding="async"
                onLoad={() => setLoadedImages(prev => new Set(prev).add(index))}
              />
              {/* Gradient overlay - stronger for text readability */}
              <div
                className="absolute inset-0"
                style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.15) 100%)' }}
              />
              {/* Text */}
              <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-8">
                <h3
                  className="text-base sm:text-xl md:text-2xl font-bold mb-2 leading-tight"
                  style={{ fontFamily: designTokens.typography.display, color: '#FFFFFF' }}
                >
                  {challenge.title}
                </h3>
                <p
                  className="text-sm sm:text-base leading-relaxed line-clamp-2 md:line-clamp-none max-w-xl"
                  style={{ color: 'rgba(255,255,255,0.75)' }}
                >
                  {challenge.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================================================================
// SOLUTION SECTION (Horizontal scroll on mobile, grid on desktop)
// ===================================================================

const SolutionSection = () => {
  const solutions = [
    {
      label: 'STAMP RALLY',
      title: 'チェックインでスタンプGET',
      description: 'イベント会場でGPSチェックイン! 9つ集めるとAmazonギフトカードをプレゼント。',
      iconElement: <Trophy className="w-6 h-6" />,
      color: designTokens.colors.accent.goldDark,
    },
    {
      label: 'MAP',
      title: 'イベントを地図でかんたん検索',
      description: '現在地周辺や気になるエリアのイベントを地図上で直感的に探せます。',
      iconElement: <MapPin className="w-6 h-6" />,
      color: designTokens.colors.primary.base,
    },
    {
      label: 'DISCOVER',
      title: '週末のイベント、もう見逃さない',
      description: '大分県内のイベント情報をリアルタイムで集約。「知らなかった」を「行ってきた!」に変える。',
      iconElement: <Sparkles className="w-6 h-6" />,
      color: designTokens.colors.accent.lilac,
    },
    {
      label: 'REWARD',
      title: '参加するほどおトクに',
      description: 'スタンプラリーで大分の魅力を巡ろう。β版公開記念のAmazonギフトカード特典を実施中!',
      iconElement: <Gift className="w-6 h-6" />,
      color: designTokens.colors.secondary.fern,
    },
  ];

  return (
    <section
      className="py-16 sm:py-20 px-5 relative"
      style={{ background: designTokens.colors.background.cloud }}
    >
      <div className="container mx-auto max-w-6xl">
        <AppSectionHeader label="Solution" title="探す、行く、集める。新しいイベント体験" />

        <p
          className="text-base sm:text-lg mb-10 max-w-2xl leading-relaxed"
          style={{ fontFamily: designTokens.typography.body, color: designTokens.colors.text.secondary }}
        >
          大分県18市町村のイベントを地図で探して、現地でチェックイン。
          スタンプを集めて特典をもらおう。
        </p>

        {/* Mobile: Horizontal scroll, Desktop: 2x2 Grid */}
        <div className="flex md:grid md:grid-cols-2 gap-4 md:gap-6 overflow-x-auto md:overflow-visible snap-x snap-mandatory md:snap-none scrollbar-hide pb-2 md:pb-0 -mx-5 px-5 md:mx-0 md:px-0">
          {solutions.map((solution, index) => (
            <div
              key={solution.label}
              className="w-72 sm:w-80 md:w-auto flex-shrink-0 snap-start"
            >
              <div
                className="relative rounded-3xl p-6 sm:p-8 h-full overflow-hidden group transition-all duration-300 hover:shadow-lg"
                style={{
                  background: designTokens.colors.background.white,
                  boxShadow: designTokens.elevation.low,
                  border: `1px solid ${designTokens.colors.secondary.stone}20`,
                }}
              >
                {/* Background accent */}
                <div
                  className="absolute top-0 right-0 w-48 h-48 opacity-[0.06] group-hover:opacity-[0.12] transition-opacity duration-500"
                  style={{ background: `radial-gradient(circle at top right, ${solution.color} 0%, transparent 70%)` }}
                />

                <div className="relative z-10">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: `${solution.color}15`, color: solution.color }}
                  >
                    {solution.iconElement}
                  </div>
                  <span className="text-xs font-bold tracking-[0.2em] mb-2 block" style={{ color: solution.color }}>
                    {solution.label}
                  </span>
                  <h3
                    className="text-base sm:text-xl font-bold mb-3 leading-tight"
                    style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.primary.base }}
                  >
                    {solution.title}
                  </h3>
                  <p
                    className="text-sm sm:text-base leading-relaxed"
                    style={{ fontFamily: designTokens.typography.body, color: designTokens.colors.text.secondary }}
                  >
                    {solution.description}
                  </p>
                </div>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"
                  style={{ background: solution.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ===================================================================
// CONTACT + COMPANY (Merged dark section)
// ===================================================================

const ContactCompanySection = () => {
  const companyInfo = [
    { label: '会社名', value: '株式会社Nobody' },
    { label: '代表者', value: '藤原泰樹' },
    { label: '所在地', value: '大分県大分市大字旦野原700番地 大分大学研究マネジメント機構4階423' },
    { label: '設立', value: '2025年8月' },
    { label: '資本金', value: '30万円' },
    { label: '事業内容', value: 'アプリケーション開発、AI導入支援、地域課題解決プラットフォームの運営' },
  ];

  return (
    <section
      className="py-16 sm:py-20 px-5 relative"
      style={{ background: designTokens.colors.primary.base }}
    >
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16">
          {/* Contact */}
          <div>
            <span className="block text-xs font-bold tracking-[0.25em] uppercase mb-2" style={{ color: designTokens.colors.accent.gold }}>
              Contact
            </span>
            <h2
              className="text-2xl sm:text-3xl font-bold mb-4"
              style={{ fontFamily: designTokens.typography.display, color: '#FFFFFF' }}
            >
              お問い合わせ
            </h2>
            <p className="text-base leading-relaxed mb-6" style={{ color: 'rgba(255,255,255,0.7)' }}>
              サービスに関するご質問やご要望は、
              お気軽にお問い合わせください。
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:sobota@nobody-info.com"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  color: '#FFFFFF',
                }}
              >
                <MessageSquare className="w-4 h-4" />
                sobota@nobody-info.com
              </a>
              <a
                href="/contact"
                className="inline-flex items-center gap-1 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
                style={{
                  background: designTokens.colors.accent.gold,
                  color: designTokens.colors.text.primary,
                }}
              >
                お問い合わせフォーム
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Company */}
          <div>
            <span className="block text-xs font-bold tracking-[0.25em] uppercase mb-2" style={{ color: designTokens.colors.accent.gold }}>
              Company
            </span>
            <h2
              className="text-2xl sm:text-3xl font-bold mb-6"
              style={{ fontFamily: designTokens.typography.display, color: '#FFFFFF' }}
            >
              運営会社
            </h2>
            <dl className="space-y-3">
              {companyInfo.map((item) => (
                <div key={item.label} className="flex gap-4">
                  <dt className="text-xs font-semibold w-20 flex-shrink-0 pt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {item.label}
                  </dt>
                  <dd className="text-sm" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {item.value}
                  </dd>
                </div>
              ))}
              <div className="flex gap-4">
                <dt className="text-xs font-semibold w-20 flex-shrink-0 pt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Website
                </dt>
                <dd>
                  <a
                    href="https://www.nobody-inc.jp/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm inline-flex items-center gap-1 hover:opacity-70 transition-opacity"
                    style={{ color: designTokens.colors.accent.gold }}
                  >
                    nobody-inc.jp
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
};

// ===================================================================
// FOOTER (Simplified)
// ===================================================================

const Footer = () => (
  <footer
    className="py-8 sm:py-10 px-5 pb-24 md:pb-10"
    style={{
      background: designTokens.colors.background.mist,
      borderTop: `1px solid ${designTokens.colors.secondary.stone}20`,
    }}
  >
    <div className="container mx-auto max-w-6xl">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src="https://res.cloudinary.com/dz9trbwma/image/upload/f_auto,q_auto/v1749032362/icon_n7nsgl.png"
            alt="TOKUDOKU"
            className="h-8 w-8"
          />
          <span
            className="font-bold text-base tracking-wider"
            style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.primary.base }}
          >
            TOKUDOKU
          </span>
          <span className="text-xs hidden sm:inline" style={{ color: designTokens.colors.text.muted }}>
            大分のイベント情報を、ひとつの場所で。
          </span>
        </div>
        <div className="flex items-center gap-4">
          {[
            { href: '/terms/terms-of-service', label: '利用規約' },
            { href: '/terms/privacy-policy', label: 'プライバシー' },
            { href: '/release-notes', label: 'リリースノート' },
          ].map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-xs hover:opacity-70 transition-opacity"
              style={{ color: designTokens.colors.text.muted }}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div className="text-center mt-6">
        <p className="text-xs" style={{ color: designTokens.colors.text.muted }}>
          &copy; 2026 TOKUDOKU by Nobody Inc. All rights reserved.
        </p>
      </div>
    </div>
  </footer>
);

// ===================================================================
// LOCATION MODAL
// ===================================================================

const LocationModal = ({
  isOpen,
  onClose,
  onAllow,
  onDeny,
}: {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  onDeny: () => void;
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[100]"
          style={{ background: `${designTokens.colors.primary.base}50`, backdropFilter: 'blur(8px)' }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 30, stiffness: 400 }}
          className="fixed inset-0 flex items-center justify-center z-[101] px-4"
        >
          <ElevationCard elevation="high" padding="xl" hover={false} className="w-full max-w-md text-center">
            <h3
              className="text-2xl font-bold mb-3"
              style={{ fontFamily: designTokens.typography.display, color: designTokens.colors.primary.base }}
            >
              位置情報の利用
            </h3>
            <p className="mb-8" style={{ color: designTokens.colors.text.secondary }}>
              地図上にあなたの現在地を表示するために
              位置情報を使用します。
            </p>
            <div className="space-y-3">
              <button
                onClick={onAllow}
                className="w-full py-4 rounded-xl font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
                style={{ background: designTokens.colors.accent.lilac, color: '#FFFFFF' }}
              >
                <MapPin className="w-5 h-5" />
                位置情報を許可して探索
              </button>
              <button
                onClick={onDeny}
                className="w-full py-4 rounded-xl font-medium active:scale-[0.98] transition-transform"
                style={{ color: designTokens.colors.text.secondary, background: `${designTokens.colors.secondary.stone}20` }}
              >
                今はスキップ
              </button>
            </div>
            <p className="text-xs mt-6" style={{ color: designTokens.colors.text.muted }}>
              ※ブラウザの設定で位置情報の許可をONにしてください
            </p>
          </ElevationCard>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ===================================================================
// MAIN COMPONENT
// ===================================================================

export default function Home() {
  const router = useRouter();
  const { showFeedbackModal, setShowFeedbackModal, openFeedbackModal } = useFeedback();
  const [isScrolled, setIsScrolled] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const [city, setCity] = useState('all');
  const [target, setTarget] = useState('none');

  useEffect(() => {
    let rafId: number | null = null;
    const handleScroll = () => {
      if (rafId !== null) return;
      rafId = requestAnimationFrame(() => {
        const y = window.scrollY;
        setIsScrolled(y > 50);
        rafId = null;
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, []);

  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        setCity('all');
        setTarget('none');
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, []);

  const handleStart = () => {
    trackEvent('cta_click', { cta_name: 'start_map', page: 'landing' });
    setShowLocationModal(true);
  };

  const handleEventSearch = (params: { city: string; target: string }) => {
    trackEvent('cta_click', { cta_name: 'event_search', page: 'landing' });
    trackEvent('event_search', { city: params.city, target: params.target });
    const searchParams = new URLSearchParams();
    searchParams.set('city', params.city?.trim() || 'all');
    if (params.target?.trim()) searchParams.set('target', params.target.trim());
    router.push(`/events?${searchParams.toString()}`);
  };

  const handleAllowLocation = async () => {
    if ('geolocation' in navigator) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          });
        });
        localStorage.setItem('userLocation', JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: Date.now(),
          expiresAt: Date.now() + 60 * 60 * 1000,
        }));
        localStorage.setItem('locationPermission', JSON.stringify({
          isGranted: true,
          timestamp: Date.now(),
        }));
        setShowLocationModal(false);
        router.push('/map');
      } catch (error) {
        console.error('位置情報の取得に失敗:', error);
        setShowLocationModal(false);
        router.push('/map');
      }
    } else {
      setShowLocationModal(false);
      router.push('/map');
    }
  };

  const handleDenyLocation = () => {
    setShowLocationModal(false);
    router.push('/map');
  };

  return (
    <main
      className="min-h-screen pb-20 md:pb-0"
      style={{
        background: designTokens.colors.background.mist,
        fontFamily: designTokens.typography.body,
      }}
    >
      <Header
        isScrolled={isScrolled}
        onFeedbackOpen={openFeedbackModal}
        onMenuOpen={() => setIsMenuOpen(true)}
      />

      <SideMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onFeedbackOpen={openFeedbackModal}
      />

      <HeroSection
        onStart={handleStart}
        onEventSearch={handleEventSearch}
        city={city}
        setCity={setCity}
        target={target}
        setTarget={setTarget}
      />

      <AnnouncementSection />

      <EventShowcaseSection />

      <ChallengesSection />

      <SolutionSection />

      <NoteArticlesSection username="kind_ixora3833" maxItems={4} />

      <ContactCompanySection />

      <Footer />

      <BottomTabNav
        onMapClick={handleStart}
        onMenuOpen={() => setIsMenuOpen(true)}
      />

      <LocationModal
        isOpen={showLocationModal}
        onClose={handleDenyLocation}
        onAllow={handleAllowLocation}
        onDeny={handleDenyLocation}
      />

      <FeedbackModal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />

    </main>
  );
}
