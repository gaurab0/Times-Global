export interface ApiResponse<T> {
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  [key: string]: unknown;
}

interface ApiErrorLike {
  data?: { detail?: string; [key: string]: unknown };
  message?: string;
}

export const unwrapList = <T,>(data: T[] | ApiResponse<T> | undefined): T[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.results ?? [];
};

export const getApiErrorMessage = (
  err: ApiErrorLike | unknown,
  fallback: string
): string => {
  const e = err as ApiErrorLike;
  const detail = e?.data?.detail;
  if (typeof detail === 'string' && detail) return detail;
  if (e?.message) return e.message;
  return fallback;
};

/** Must match DRF `PAGE_SIZE` in vms_project/settings.py. */
export const DEFAULT_PAGE_SIZE = 10;

export interface DateRangeParams {
  after: string;
  before: string;
}

const toIso = (d: Date): string => d.toISOString();

/** Local-midnight-to-local-endOfDay range converted to UTC ISO strings,
 *  consistent for both "today" panels and user-picked date filters. */
export const localDayRangeToUtc = (dayStart: Date, dayEnd?: Date): DateRangeParams => {
  const start = new Date(dayStart);
  start.setHours(0, 0, 0, 0);
  const end = dayEnd ? new Date(dayEnd) : new Date(start);
  end.setHours(23, 59, 59, 999);
  return { after: toIso(start), before: toIso(end) };
};

export const todayUtcRange = (): DateRangeParams => localDayRangeToUtc(new Date());

/** Converts a yyyy-mm-dd form input to a UTC range covering that local day. */
export const datePickerRangeToUtc = (dateFrom: string, dateTo: string): DateRangeParams =>
  localDayRangeToUtc(new Date(`${dateFrom}T00:00:00`), new Date(`${dateTo || dateFrom}T00:00:00`));

export const sortByCheckInDesc = <T extends { checkInTime: string }>(list: T[]): T[] =>
  [...list].sort(
    (a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime()
  );

export const formatDate = (isoString?: string | null, includeTime = true): string => {
  if (!isoString) return 'N/A';
  try {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = true;
    }
    return new Date(isoString).toLocaleString('en-US', options);
  } catch {
    return isoString;
  }
};

/** e.g. "23 Aug 2026" — used in record-list modals. */
export const formatDateShort = (isoString?: string | null): string => {
  if (!isoString) return 'N/A';
  try {
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
};
