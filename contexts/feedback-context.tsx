"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface FeedbackContextType {
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  hasShownFeedback: boolean;
  resetFeedbackTimer: () => void;
  showFeedbackModalForced: () => void;
}

const FeedbackContext = createContext<FeedbackContextType | undefined>(undefined);

export const useFeedback = () => {
  const context = useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

interface FeedbackProviderProps {
  children: ReactNode;
}

export const FeedbackProvider: React.FC<FeedbackProviderProps> = ({ children }) => {
  const { data: session, status } = useSession();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hasShownFeedback, setHasShownFeedback] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [lastShownTime, setLastShownTime] = useState<number | null>(null);

  // 5分 = 300,000ミリ秒（初回表示用）
  const FEEDBACK_DELAY = 5 * 60 * 1000;
  // 48時間 = 172,800,000ミリ秒（再表示抑制用）
  const FEEDBACK_COOLDOWN = 48 * 60 * 60 * 1000;

  // ローカルストレージのキー（ユーザー固有）
  const getFeedbackKey = (userEmail: string) => `tokudoku_feedback_submitted_${userEmail}`;
  const getLastShownKey = (userEmail: string) => `tokudoku_feedback_last_shown_${userEmail}`;

  // ページの可視性を監視
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsActive(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // フィードバック表示の判定とタイマー設定
  useEffect(() => {
    if (status === 'loading' || !session?.user?.email) {
      return;
    }

    const userEmail = session.user.email;
    const feedbackSubmittedKey = getFeedbackKey(userEmail);
    const lastShownKey = getLastShownKey(userEmail);
    
    // このユーザーが既にフィードバックを送信済みかチェック
    const hasSubmittedFeedback = localStorage.getItem(feedbackSubmittedKey);
    if (hasSubmittedFeedback === 'true') {
      console.log('FeedbackProvider: このユーザーは既にフィードバック送信済みのため自動表示しません');
      return;
    }

    // 最後に表示した時間を取得
    const lastShown = localStorage.getItem(lastShownKey);
    const lastShownTimestamp = lastShown ? parseInt(lastShown) : 0;
    const now = Date.now();

    // 48時間以内に表示済みかチェック
    const timeSinceLastShown = now - lastShownTimestamp;
    if (lastShownTimestamp > 0 && timeSinceLastShown < FEEDBACK_COOLDOWN) {
      const remainingCooldown = FEEDBACK_COOLDOWN - timeSinceLastShown;
      const remainingHours = Math.ceil(remainingCooldown / (60 * 60 * 1000));
      console.log(`FeedbackProvider: 48時間クールダウン中（残り約${remainingHours}時間）`);
      return;
    }

    // 初回表示または48時間経過後の5分待機
    if (lastShownTimestamp === 0) {
      // 初回訪問の場合、5分後に表示
      console.log('FeedbackProvider: 初回訪問、5分後にフィードバックモーダル表示予定');
      const timer = setTimeout(() => {
        if (isActive && session?.user?.email) {
          const currentFeedbackSubmitted = localStorage.getItem(feedbackSubmittedKey);
          if (currentFeedbackSubmitted !== 'true') {
            console.log('FeedbackProvider: 5分経過、フィードバックモーダル表示');
            setShowFeedbackModal(true);
            setLastShownTime(Date.now());
            localStorage.setItem(lastShownKey, Date.now().toString());
          }
        }
      }, FEEDBACK_DELAY);

      return () => clearTimeout(timer);
    } else {
      // 48時間経過後、即座に表示
      console.log('FeedbackProvider: 48時間経過済み、フィードバックモーダル表示');
      setShowFeedbackModal(true);
      setLastShownTime(now);
      localStorage.setItem(lastShownKey, now.toString());
    }
  }, [session, status, isActive]);

  // モーダルを閉じる時の処理を追加
  const handleCloseModal = (show: boolean) => {
    setShowFeedbackModal(show);
    
    // モーダルを閉じる時（show = false）に最終表示時間を記録
    if (!show && session?.user?.email) {
      const userEmail = session.user.email;
      const lastShownKey = getLastShownKey(userEmail);
      localStorage.setItem(lastShownKey, Date.now().toString());
      console.log('FeedbackProvider: フィードバックモーダル閉じる、48時間クールダウン開始');
    }
  };

  // 強制的にフィードバックモーダルを表示する関数
  const showFeedbackModalForced = () => {
    console.log('FeedbackProvider: フィードバックモーダルを強制表示');
    setShowFeedbackModal(true);
  };

  // フィードバックタイマーのリセット（デバッグ用）
  const resetFeedbackTimer = () => {
    if (session?.user?.email) {
      const userEmail = session.user.email;
      const feedbackSubmittedKey = getFeedbackKey(userEmail);
      const lastShownKey = getLastShownKey(userEmail);
      
      localStorage.removeItem(feedbackSubmittedKey);
      localStorage.removeItem(lastShownKey);
    }
    
    setHasShownFeedback(false);
    setShowFeedbackModal(false);
    setLastShownTime(null);
    console.log('FeedbackProvider: タイマーとフィードバック送信フラグをリセット');
  };

  const value: FeedbackContextType = {
    showFeedbackModal,
    setShowFeedbackModal: handleCloseModal,
    hasShownFeedback,
    resetFeedbackTimer,
    showFeedbackModalForced,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
};
