export const calculateExpiresAt = (
  expiryOption: '15m' | '30m' | '45m' | '60m' | '12h' | '24h' | 'days' | '90d',
  customMinutes?: number,
  customDays?: number
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
    case '12h':
      minutesToAdd = 12 * 60; // 12時間 = 720分
      break;
    case '24h':
      minutesToAdd = 24 * 60; // 24時間 = 1440分
      break;
    case '90d':
      minutesToAdd = 90 * 24 * 60; // 90日間 = 129,600分
      break;
    case 'days':
      if (customDays && customDays > 0 && customDays <= 90) {
        minutesToAdd = customDays * 24 * 60; // 日数を分に変換
      } else {
        console.warn(`無効な日数設定: ${customDays}。デフォルトで7日を設定します。`);
        minutesToAdd = 7 * 24 * 60;
      }
      break;
    default:
      console.warn(`無効な掲載期間: ${expiryOption}。デフォルトで30分を設定します。`);
      minutesToAdd = 30;
  }

  now.setMinutes(now.getMinutes() + minutesToAdd);
  return now;
};
