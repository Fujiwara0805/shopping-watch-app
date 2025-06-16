"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

interface FeedbackContextType {
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  hasShownFeedback: boolean;
  resetFeedbackTimer: () => void;
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
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(true);

  // 5分 = 300,000ミリ秒
  const FEEDBACK_DELAY = 5 * 60 * 1000;

  // ローカルストレージのキー（ユーザー固有）
  const getFeedbackKey = (userEmail: string) => `tokudoku_feedback_submitted_${userEmail}`;
  const FEEDBACK_SHOWN_KEY = 'tokudoku_feedback_shown';

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
    
    // 🔥 このユーザーが既にフィードバックを送信済みかチェック
    const hasSubmittedFeedback = localStorage.getItem(feedbackSubmittedKey);
    if (hasSubmittedFeedback === 'true') {
      console.log('FeedbackProvider: このユーザーは既にフィードバック送信済みのため表示しません');
      return;
    }

    // セッション中に既に表示済みの場合はスキップ
    const feedbackShown = localStorage.getItem(FEEDBACK_SHOWN_KEY);
    if (feedbackShown === 'true') {
      setHasShownFeedback(true);
      return;
    }

    // タイマー開始
    setStartTime(Date.now());
    console.log('FeedbackProvider: フィードバックタイマー開始');

    const timer = setTimeout(() => {
      if (isActive && session?.user?.email) {
        console.log('FeedbackProvider: 5分経過、フィードバックモーダル表示');
        setShowFeedbackModal(true);
        setHasShownFeedback(true);
        localStorage.setItem(FEEDBACK_SHOWN_KEY, 'true');
      }
    }, FEEDBACK_DELAY);

    return () => {
      clearTimeout(timer);
    };
  }, [session, status, isActive]);

  // フィードバック送信完了時の処理
  const handleFeedbackSubmitted = () => {
    if (session?.user?.email) {
      const userEmail = session.user.email;
      const feedbackSubmittedKey = getFeedbackKey(userEmail);
      
      // 🔥 このユーザーのフィードバック送信完了フラグを永続的に保存
      localStorage.setItem(feedbackSubmittedKey, 'true');
      console.log('FeedbackProvider: フィードバック送信完了フラグを保存しました');
    }
    setShowFeedbackModal(false);
  };

  // フィードバックタイマーのリセット（デバッグ用）
  const resetFeedbackTimer = () => {
    localStorage.removeItem(FEEDBACK_SHOWN_KEY);
    
    // 🔥 現在のユーザーのフィードバック送信フラグもリセット
    if (session?.user?.email) {
      const userEmail = session.user.email;
      const feedbackSubmittedKey = getFeedbackKey(userEmail);
      localStorage.removeItem(feedbackSubmittedKey);
    }
    
    setHasShownFeedback(false);
    setShowFeedbackModal(false);
    setStartTime(Date.now());
    console.log('FeedbackProvider: タイマーとフィードバック送信フラグをリセット');
  };

  const value: FeedbackContextType = {
    showFeedbackModal,
    setShowFeedbackModal: (show: boolean) => {
      setShowFeedbackModal(show);
      if (!show) {
        // 🔥 モーダルが閉じられた時にフィードバック送信完了として扱う
        handleFeedbackSubmitted();
      }
    },
    hasShownFeedback,
    resetFeedbackTimer,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
};
