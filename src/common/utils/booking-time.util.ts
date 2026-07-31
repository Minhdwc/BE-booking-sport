export const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

type VnClock = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

export function getVnClock(date = new Date()): VnClock {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: VN_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  ) as Record<string, string>;

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
  };
}

export function parseTimeToMinutes(time: string): number {
  const normalized = time.trim();
  const match = normalized.match(/T(\d{2}):(\d{2})/) ?? normalized.match(/^(\d{2}):(\d{2})/);
  if (!match) return Number.NaN;
  return Number(match[1]) * 60 + Number(match[2]);
}

export function parseDateKey(dateStr: string): number {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return year * 10000 + month * 100 + day;
}

function toDateKey(clock: Pick<VnClock, 'year' | 'month' | 'day'>): number {
  return clock.year * 10000 + clock.month * 100 + clock.day;
}

export function isDateBeforeTodayVn(dateStr: string, now = new Date()): boolean {
  return parseDateKey(dateStr) < toDateKey(getVnClock(now));
}

/** True when slot start is strictly before current VN local time. */
export function isSlotStartInPast(dateStr: string, startTime: string, now = new Date()): boolean {
  if (isDateBeforeTodayVn(dateStr, now)) return true;

  const slotDateKey = parseDateKey(dateStr);
  const nowDateKey = toDateKey(getVnClock(now));
  if (slotDateKey > nowDateKey) return false;

  const startMinutes = parseTimeToMinutes(startTime);
  if (Number.isNaN(startMinutes)) return false;

  const { hour, minute } = getVnClock(now);
  return startMinutes < hour * 60 + minute;
}

export function todayIsoDateVn(now = new Date()): string {
  const { year, month, day } = getVnClock(now);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
