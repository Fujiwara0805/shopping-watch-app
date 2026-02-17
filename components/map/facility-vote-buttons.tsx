"use client";

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { designTokens } from '@/lib/constants';
import { v4 as uuidv4 } from 'uuid';

interface FacilityVoteButtonsProps {
  facilityReportId: string;
}

function getVoterFingerprint(): string {
  if (typeof window === 'undefined') return '';
  let fp = localStorage.getItem('voter_fingerprint');
  if (!fp) {
    fp = uuidv4();
    localStorage.setItem('voter_fingerprint', fp);
  }
  return fp;
}

export function FacilityVoteButtons({ facilityReportId }: FacilityVoteButtonsProps) {
  const [existsCount, setExistsCount] = useState(0);
  const [notExistsCount, setNotExistsCount] = useState(0);
  const [userVoted, setUserVoted] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);

  const fetchVotes = useCallback(async () => {
    const fp = getVoterFingerprint();
    try {
      const res = await fetch(`/api/facility-votes?facility_report_id=${facilityReportId}&voter_fingerprint=${fp}`);
      if (res.ok) {
        const data = await res.json();
        setExistsCount(data.exists_count);
        setNotExistsCount(data.not_exists_count);
        setUserVoted(data.user_voted);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [facilityReportId]);

  useEffect(() => {
    fetchVotes();
  }, [fetchVotes]);

  const handleVote = async (voteType: 'exists' | 'not_exists') => {
    if (voting) return;
    setVoting(true);
    const fp = getVoterFingerprint();
    try {
      const res = await fetch('/api/facility-votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facility_report_id: facilityReportId,
          vote_type: voteType,
          voter_fingerprint: fp,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setExistsCount(data.exists_count);
        setNotExistsCount(data.not_exists_count);
        setUserVoted(data.user_voted);
      }
    } catch {
      // silent
    } finally {
      setVoting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2">
        <div className="h-8 w-20 rounded-lg animate-pulse" style={{ background: designTokens.colors.background.cloud }} />
        <div className="h-8 w-20 rounded-lg animate-pulse" style={{ background: designTokens.colors.background.cloud }} />
      </div>
    );
  }

  return (
    <div className="mb-3">
      <p className="text-xs font-medium mb-2" style={{ color: designTokens.colors.text.muted }}>
        このゴミ箱はまだありますか？
      </p>
      <div className="flex items-center gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleVote('exists')}
          disabled={voting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: userVoted === 'exists' ? designTokens.colors.functional.success : `${designTokens.colors.functional.success}15`,
            color: userVoted === 'exists' ? '#fff' : designTokens.colors.functional.success,
            border: `1px solid ${designTokens.colors.functional.success}${userVoted === 'exists' ? '' : '40'}`,
            opacity: voting ? 0.7 : 1,
          }}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
          有 {existsCount > 0 && <span>({existsCount})</span>}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleVote('not_exists')}
          disabled={voting}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          style={{
            background: userVoted === 'not_exists' ? designTokens.colors.functional.error : `${designTokens.colors.functional.error}15`,
            color: userVoted === 'not_exists' ? '#fff' : designTokens.colors.functional.error,
            border: `1px solid ${designTokens.colors.functional.error}${userVoted === 'not_exists' ? '' : '40'}`,
            opacity: voting ? 0.7 : 1,
          }}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
          無 {notExistsCount > 0 && <span>({notExistsCount})</span>}
        </motion.button>
      </div>
    </div>
  );
}
