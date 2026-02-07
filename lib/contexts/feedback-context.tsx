"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface FeedbackContextType {
  showFeedbackModal: boolean;
  setShowFeedbackModal: (show: boolean) => void;
  openFeedbackModal: () => void;
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
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  const openFeedbackModal = () => {
    setShowFeedbackModal(true);
  };

  const value: FeedbackContextType = {
    showFeedbackModal,
    setShowFeedbackModal,
    openFeedbackModal,
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
    </FeedbackContext.Provider>
  );
};
