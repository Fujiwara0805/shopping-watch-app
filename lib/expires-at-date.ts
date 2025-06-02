export const calculateExpiresAt = (expiryOption: '1h' | '3h' | '6h' | '12h'): Date => {
  const now = new Date();
  let hoursToAdd = 0;

  switch (expiryOption) {
    case '1h':
      hoursToAdd = 1;
      break;
    case '3h':
      hoursToAdd = 3;
      break;
    case '6h':
      hoursToAdd = 6;
      break;
    case '12h':
      hoursToAdd = 12;
      break;
    default:
      // Zodスキーマにより通常ここには到達しませんが、フォールバックとして設定
      console.warn(`無効な掲載期間: ${expiryOption}。デフォルトで3時間を設定します。`);
      hoursToAdd = 3;
  }

  now.setHours(now.getHours() + hoursToAdd);
  return now;
};
