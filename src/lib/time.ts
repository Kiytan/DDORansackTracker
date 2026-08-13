const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Human-readable countdown, e.g. "2d 06h", "6h 14m", "42s".
 *
 * Precision drops as the duration grows — nobody needs seconds on a seven-day timer,
 * and re-rendering them every second on 800 rows is wasteful.
 */
export function formatDuration(ms: number): string {
	if (ms <= 0) return '0s';

	const days = Math.floor(ms / DAY);
	const hours = Math.floor((ms % DAY) / HOUR);
	const minutes = Math.floor((ms % HOUR) / MINUTE);
	const seconds = Math.floor((ms % MINUTE) / SECOND);

	if (days > 0) return `${days}d ${pad(hours)}h`;
	if (hours > 0) return `${hours}h ${pad(minutes)}m`;
	if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
	return `${seconds}s`;
}

/** Longer form used in tooltips, e.g. "2 days, 6 hours, 14 minutes". */
export function formatDurationLong(ms: number): string {
	if (ms <= 0) return 'now';

	const days = Math.floor(ms / DAY);
	const hours = Math.floor((ms % DAY) / HOUR);
	const minutes = Math.floor((ms % HOUR) / MINUTE);

	const parts: string[] = [];
	if (days > 0) parts.push(plural(days, 'day'));
	if (hours > 0) parts.push(plural(hours, 'hour'));
	if (minutes > 0 && days === 0) parts.push(plural(minutes, 'minute'));

	return parts.length > 0 ? parts.join(', ') : 'less than a minute';
}

/** Absolute date/time in UK format, e.g. "13/08/2026, 17:25". */
export function formatDateTime(epochMs: number): string {
	if (!epochMs) return '—';
	return new Date(epochMs).toLocaleString('en-GB', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

/** Day + time only, e.g. "Thu 13 Aug, 17:25" — used where the year is noise. */
export function formatShortDateTime(epochMs: number): string {
	if (!epochMs) return '—';
	return new Date(epochMs).toLocaleString('en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export interface DurationParts {
	days: number;
	hours: number;
	minutes: number;
}

/**
 * Split a duration for the days/hours/minutes inputs.
 *
 * Rounds up to the next whole minute, because the in-game text reads
 * "6 days 23 hours 4 minutes 44 seconds" and typing that in should not quietly
 * shorten the window by the dropped seconds.
 */
export function splitDuration(ms: number): DurationParts {
	const total = Math.max(0, Math.ceil(ms / MINUTE));
	return {
		days: Math.floor(total / (24 * 60)),
		hours: Math.floor((total % (24 * 60)) / 60),
		minutes: total % 60
	};
}

export function joinDuration({ days, hours, minutes }: DurationParts): number {
	const safe = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0);
	return safe(days) * DAY + safe(hours) * HOUR + safe(minutes) * MINUTE;
}

/** Epoch ms → the `YYYY-MM-DDTHH:mm` string an `<input type="datetime-local">` wants. */
export function toDateTimeLocal(epochMs: number): string {
	const date = new Date(epochMs);
	return [
		date.getFullYear(),
		'-',
		pad(date.getMonth() + 1),
		'-',
		pad(date.getDate()),
		'T',
		pad(date.getHours()),
		':',
		pad(date.getMinutes())
	].join('');
}

/** The inverse of `toDateTimeLocal`. Returns NaN for an empty or malformed value. */
export function fromDateTimeLocal(value: string): number {
	if (!value) return Number.NaN;
	return new Date(value).getTime();
}

function pad(value: number): string {
	return value < 10 ? `0${value}` : String(value);
}

function plural(value: number, noun: string): string {
	return `${value} ${noun}${value === 1 ? '' : 's'}`;
}
