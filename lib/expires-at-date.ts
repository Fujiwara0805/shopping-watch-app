export const calculateExpiresAt = (expiryOption: '1h' | '3h' | '24h'): Date => {
  const now = new Date();
  let hoursToAdd = 0;

  switch (expiryOption) {
    case '1h':
      hoursToAdd = 1;
      break;
    case '3h':
      hoursToAdd = 3;
      break;
    case '24h':
      hoursToAdd = 24;
      break;
    default:
      // Zodスキーマにより通常ここには到達しませんが、フォールバックとして設定
      console.warn(`無効な掲載期間: ${expiryOption}。デフォルトで3時間を設定します。`);
      hoursToAdd = 3;
  }

  now.setHours(now.getHours() + hoursToAdd);
  return now;
};
