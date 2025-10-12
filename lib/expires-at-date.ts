export const calculateExpiresAt = (
  expiryOption: '15m' | '30m' | '45m' | '60m' | 'custom' | '90d',
  customMinutes?: number
): Date => {
  const now = new Date();
  let minutesToAdd = 0;

  switch (expiryOption) {
    case '15m':
      minutesToAdd = 15;
      break;
    case '30m':
      minutesToAdd = 30;
      break;
    case '45m':
      minutesToAdd = 45;
      break;
    case '60m':
      minutesToAdd = 60;
      break;
    case '90d':
      minutesToAdd = 90 * 24 * 60; // 90日間 = 129,600分
      break;
    case 'custom':
      if (customMinutes && customMinutes > 0 && customMinutes <= 720) {
        minutesToAdd = customMinutes;
      } else {
        console.warn(`無効なカスタム掲載時間: ${customMinutes}。デフォルトで30分を設定します。`);
        minutesToAdd = 30;
      }
      break;
    default:
      console.warn(`無効な掲載期間: ${expiryOption}。デフォルトで30分を設定します。`);
      minutesToAdd = 30;
  }

  now.setMinutes(now.getMinutes() + minutesToAdd);
  return now;
};
