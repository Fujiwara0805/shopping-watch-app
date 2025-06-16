"use client";

import React from 'react';
import { useFeedback } from '@/contexts/feedback-context';
import { FeedbackModal } from './feedback-modal';

export const FeedbackIntegration: React.FC = () => {
  const { showFeedbackModal, setShowFeedbackModal } = useFeedback();

  return (
    <FeedbackModal
      isOpen={showFeedbackModal}
      onClose={() => setShowFeedbackModal(false)}
    />
  );
};
