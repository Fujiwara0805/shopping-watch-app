'use client';

import { useEffect, useState, useTransition } from 'react';
import { ShieldCheck, Mail } from 'lucide-react';
import { designTokens } from '@/lib/constants';
import { getMyVerifiedStatus, requestMeetupEmailVerification } from '@/app/_actions/meetup-verify';
import { trackEvent } from '@/lib/services/analytics';

interface Props {
  /** プロフィールページからのリダイレクトクエリ（?meetup_verify=ok） */
  initialFlash?: string | null;
}

export function VerifyEmailCta({ initialFlash }: Props) {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getMyVerifiedStatus().then((s) => {
      if (cancelled) return;
      setVerified(s.verified);
      setEmail(s.email ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (initialFlash === 'ok') {
      setFlash('メールアドレスを確認しました。Verified バッジが付与されました。');
      trackEvent('meetup_email_verified');
    } else if (initialFlash === 'missing_token' || initialFlash === 'error') {
      setFlash('リンクが無効か期限切れです。もう一度送信してください。');
    }
  }, [initialFlash]);

  if (verified === null) return null;
  if (verified) {
    return (
      <div
        className="rounded-xl px-3 py-2 inline-flex items-center gap-2 text-xs font-semibold"
        style={{
          background: `${designTokens.colors.functional.success}1a`,
          color: designTokens.colors.functional.success,
          border: `1px solid ${designTokens.colors.functional.success}55`,
        }}
      >
        <ShieldCheck className="h-3.5 w-3.5" />
        Verified（メール確認済）
      </div>
    );
  }

  const handleSend = () => {
    startTransition(async () => {
      const res = await requestMeetupEmailVerification();
      if (res.error === 'already_verified') {
        setVerified(true);
        return;
      }
      if (res.error) {
        setFlash(`送信に失敗しました（${res.error}）`);
        return;
      }
      trackEvent('meetup_email_verify_request');
      setFlash(`${email ?? '登録メール'} に確認メールを送信しました。受信箱をご確認ください。`);
    });
  };

  return (
    <div
      className="rounded-2xl p-4"
      style={{
        background: `${designTokens.colors.accent.lilac}10`,
        border: `1px dashed ${designTokens.colors.accent.lilac}80`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <Mail className="h-4 w-4" style={{ color: designTokens.colors.accent.lilacDark }} />
        <p
          className="text-sm font-semibold"
          style={{ color: designTokens.colors.text.primary, fontFamily: designTokens.typography.display }}
        >
          メール確認で Verified バッジを取得
        </p>
      </div>
      <p className="text-xs mb-3 leading-relaxed" style={{ color: designTokens.colors.text.secondary }}>
        メールアドレスを確認すると Verified バッジが付き、ホストルームに参加できるようになります。
      </p>
      <button
        onClick={handleSend}
        disabled={isPending}
        className="text-xs font-semibold px-4 py-2 rounded-full transition-transform hover:scale-105 disabled:opacity-50"
        style={{
          background: designTokens.colors.accent.lilac,
          color: designTokens.colors.text.inverse,
        }}
      >
        {isPending ? '送信中...' : '確認メールを送る'}
      </button>
      {flash && (
        <p className="text-[11px] mt-2" style={{ color: designTokens.colors.text.secondary }}>
          {flash}
        </p>
      )}
    </div>
  );
}
