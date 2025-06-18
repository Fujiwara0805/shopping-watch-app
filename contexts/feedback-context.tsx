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

  // 5分 = 300,000ミリ秒
  const FEEDBACK_DELAY = 5 * 60 * 1000;

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

    // 5分経過していない場合は待機
    const timeSinceLastShown = now - lastShownTimestamp;
    if (timeSinceLastShown < FEEDBACK_DELAY) {
      const remainingTime = FEEDBACK_DELAY - timeSinceLastShown;
      console.log(`FeedbackProvider: 次回表示まで残り${Math.ceil(remainingTime / 1000)}秒`);

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
      }, remainingTime);

      return () => clearTimeout(timer);
    } else {
      // 既に5分経過している場合は即座に表示
      console.log('FeedbackProvider: 5分経過済み、フィードバックモーダル表示');
      setShowFeedbackModal(true);
      setLastShownTime(now);
      localStorage.setItem(lastShownKey, now.toString());
    }
  }, [session, status, isActive]);

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
    setShowFeedbackModal,
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
