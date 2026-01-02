/**
 * 日本の祝日ロジック
 * 2024年〜2030年対応（ハッピーマンデー、振替休日、国民の休日を含む）
 */

import { format, getDay, addDays, isSunday, getYear, getMonth, getDate } from 'date-fns';

export interface Holiday {
  date: string;
  name: string;
  isSubstitute?: boolean;
  isNationalHoliday?: boolean; // 国民の休日
}

/**
 * 指定月の第N月曜日を取得
 */
function getNthMondayOfMonth(year: number, month: number, n: number): Date {
  const firstDay = new Date(year, month - 1, 1);
  const dayOfWeek = firstDay.getDay();
  // 最初の月曜日を計算（日曜=0, 月曜=1）
  const firstMonday = dayOfWeek <= 1 
    ? 1 + (1 - dayOfWeek) 
    : 1 + (8 - dayOfWeek);
  const nthMonday = firstMonday + (n - 1) * 7;
  return new Date(year, month - 1, nthMonday);
}

/**
 * 春分の日を計算（1900年〜2099年対応）
 */
function getVernalEquinoxDay(year: number): number {
  if (year < 1900 || year > 2099) {
    return 21; // デフォルト値
  }
  if (year >= 1900 && year <= 1979) {
    return Math.floor(20.8357 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  }
  if (year >= 1980 && year <= 2099) {
    return Math.floor(20.8431 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return 21;
}

/**
 * 秋分の日を計算（1900年〜2099年対応）
 */
function getAutumnalEquinoxDay(year: number): number {
  if (year < 1900 || year > 2099) {
    return 23; // デフォルト値
  }
  if (year >= 1900 && year <= 1979) {
    return Math.floor(23.2588 + 0.242194 * (year - 1980) - Math.floor((year - 1983) / 4));
  }
  if (year >= 1980 && year <= 2099) {
    return Math.floor(23.2488 + 0.242194 * (year - 1980) - Math.floor((year - 1980) / 4));
  }
  return 23;
}

/**
 * 日付を YYYY-MM-DD 形式にフォーマット
 */
function formatDateString(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * 指定年の祝日一覧を取得（振替休日・国民の休日を含む）
 */
export function getHolidays(year: number): Holiday[] {
  const holidays: Holiday[] = [];
  
  // 固定祝日
  const fixedHolidays: { month: number; day: number; name: string }[] = [
    { month: 1, day: 1, name: '元日' },
    { month: 2, day: 11, name: '建国記念の日' },
    { month: 2, day: 23, name: '天皇誕生日' },
    { month: 4, day: 29, name: '昭和の日' },
    { month: 5, day: 3, name: '憲法記念日' },
    { month: 5, day: 4, name: 'みどりの日' },
    { month: 5, day: 5, name: 'こどもの日' },
    { month: 8, day: 11, name: '山の日' },
    { month: 11, day: 3, name: '文化の日' },
    { month: 11, day: 23, name: '勤労感謝の日' },
  ];
  
  fixedHolidays.forEach(({ month, day, name }) => {
    holidays.push({
      date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
      name,
    });
  });
  
  // ハッピーマンデー（第N月曜日）
  const happyMondayHolidays: { month: number; week: number; name: string }[] = [
    { month: 1, week: 2, name: '成人の日' },      // 1月第2月曜日
    { month: 7, week: 3, name: '海の日' },        // 7月第3月曜日
    { month: 9, week: 3, name: '敬老の日' },      // 9月第3月曜日
    { month: 10, week: 2, name: 'スポーツの日' }, // 10月第2月曜日
  ];
  
  happyMondayHolidays.forEach(({ month, week, name }) => {
    const date = getNthMondayOfMonth(year, month, week);
    holidays.push({
      date: formatDateString(date),
      name,
    });
  });
  
  // 春分の日
  const vernalEquinoxDay = getVernalEquinoxDay(year);
  holidays.push({
    date: `${year}-03-${vernalEquinoxDay.toString().padStart(2, '0')}`,
    name: '春分の日',
  });
  
  // 秋分の日
  const autumnalEquinoxDay = getAutumnalEquinoxDay(year);
  holidays.push({
    date: `${year}-09-${autumnalEquinoxDay.toString().padStart(2, '0')}`,
    name: '秋分の日',
  });
  
  // 祝日の日付セットを作成（振替休日・国民の休日の計算用）
  const holidayDates = new Set(holidays.map(h => h.date));
  
  // 振替休日を追加（祝日が日曜日の場合、翌日以降の最初の平日が振替休日）
  holidays.forEach(holiday => {
    const date = new Date(holiday.date);
    if (isSunday(date)) {
      let substituteDate = addDays(date, 1);
      // 翌日以降で祝日でない日を探す
      while (holidayDates.has(formatDateString(substituteDate))) {
        substituteDate = addDays(substituteDate, 1);
      }
      const substituteDateStr = formatDateString(substituteDate);
      if (!holidayDates.has(substituteDateStr)) {
        holidays.push({
          date: substituteDateStr,
          name: '振替休日',
          isSubstitute: true,
        });
        holidayDates.add(substituteDateStr);
      }
    }
  });
  
  // 国民の休日を追加（祝日と祝日に挟まれた平日）
  // 主に秋分の日と敬老の日の間で発生
  const keirouNoHi = holidays.find(h => h.name === '敬老の日');
  const shubunNoHi = holidays.find(h => h.name === '秋分の日');
  
  if (keirouNoHi && shubunNoHi) {
    const keirouDate = new Date(keirouNoHi.date);
    const shubunDate = new Date(shubunNoHi.date);
    const daysDiff = Math.abs(shubunDate.getTime() - keirouDate.getTime()) / (1000 * 60 * 60 * 24);
    
    // 敬老の日と秋分の日が2日差の場合、間の日が国民の休日
    if (daysDiff === 2) {
      const nationalHolidayDate = addDays(keirouDate, 1);
      const nationalHolidayDateStr = formatDateString(nationalHolidayDate);
      if (!holidayDates.has(nationalHolidayDateStr)) {
        holidays.push({
          date: nationalHolidayDateStr,
          name: '国民の休日',
          isNationalHoliday: true,
        });
      }
    }
  }
  
  // 日付順にソート
  holidays.sort((a, b) => a.date.localeCompare(b.date));
  
  return holidays;
}

/**
 * 祝日をRecord形式で取得（日付 → 祝日名）
 */
export function getHolidaysRecord(year: number): Record<string, string> {
  const holidays = getHolidays(year);
  return holidays.reduce((acc, holiday) => {
    acc[holiday.date] = holiday.name;
    return acc;
  }, {} as Record<string, string>);
}

/**
 * 指定日が祝日かどうか判定
 */
export function isHoliday(date: Date): boolean {
  const year = getYear(date);
  const holidays = getHolidaysRecord(year);
  const dateStr = format(date, 'yyyy-MM-dd');
  return dateStr in holidays;
}

/**
 * 指定日が振替休日かどうか判定
 */
export function isSubstituteHoliday(date: Date): boolean {
  const year = getYear(date);
  const holidays = getHolidays(year);
  const dateStr = format(date, 'yyyy-MM-dd');
  const holiday = holidays.find(h => h.date === dateStr);
  return holiday?.isSubstitute === true;
}

/**
 * 指定日が祝日または振替休日かどうか判定
 */
export function isHolidayOrSubstitute(date: Date): boolean {
  return isHoliday(date);
}

/**
 * 指定日の祝日名を取得（祝日でない場合はnull）
 */
export function getHolidayName(date: Date): string | null {
  const year = getYear(date);
  const holidays = getHolidaysRecord(year);
  const dateStr = format(date, 'yyyy-MM-dd');
  return holidays[dateStr] || null;
}

/**
 * 六曜を計算する関数（簡易版）
 */
export function getRokuyo(date: Date): string {
  const year = getYear(date);
  const month = getMonth(date) + 1;
  const day = getDate(date);
  
  const rokuyoArray = ['大安', '赤口', '先勝', '友引', '先負', '仏滅'];
  const index = (month + day) % 6;
  
  return rokuyoArray[index];
}

// 2026年の祝日一覧（参考用エクスポート）
export const HOLIDAYS_2026 = getHolidays(2026);

