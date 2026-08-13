/** A quest, as loaded from `static/quests.json` (same shape as DDO Quest Tracker). */
export interface Quest {
	id: string;
	name: string;
	level: number;
	baseFavor: number;
	patron: string;
	adventurePack: string;
	baseQuestId?: string; // For quest variants, reference to the original quest ID
}

/** One of the player's characters. Timers are always scoped to a character. */
export interface Character {
	id: string;
	name: string;
	createdAt: string;
}

/**
 * A chest-ransack window for one quest on one character.
 *
 * The FIRST loot of a quest's chests starts a 168-hour window. Up to 8 loots are
 * allowed inside that window; further loots stop dropping named/blue items. Later
 * loots do NOT extend the window — only `firstOpen` matters for the countdown.
 */
export interface RansackTimer {
	firstOpen: string; // ISO timestamp of the loot that started the window
	opens: number; // Total loots inside this window, including the first
	lastOpen: string; // ISO timestamp of the most recent loot (display only)
}

/** A raid lockout for one raid on one character. */
export interface RaidTimer {
	completedAt: string; // ISO timestamp of the raid completion that started the lockout
}

/** Everything tracked for a single character. */
export interface CharacterData {
	ransack: { [questId: string]: RansackTimer };
	raids: { [questId: string]: RaidTimer };
}

/** The full persisted payload — also the unit of export/import and sharing. */
export interface TrackerData {
	characters: Character[];
	data: { [characterId: string]: CharacterData };
	/** Quest ids the player has added to their list, in the order they added them. */
	tracked: string[];
}

// --- Game rules -------------------------------------------------------------

/** Hours from the first loot before the ransack counter resets. */
export const RANSACK_WINDOW_HOURS = 168;

/** Loots allowed inside a ransack window before the chest stops dropping blues. */
export const RANSACK_MAX_OPENS = 8;

/** Loots remaining at or below which a quest is flagged as "running out". */
export const RANSACK_WARNING_THRESHOLD = 2;

/** Raid lockout length: 2 days 18 hours. */
export const RAID_LOCKOUT_HOURS = 66;

export const HOUR_MS = 60 * 60 * 1000;

// --- Derived state ----------------------------------------------------------

export type RansackStatus = 'clear' | 'active' | 'warning' | 'ransacked';

export interface RansackState {
	status: RansackStatus;
	opens: number;
	opensRemaining: number;
	/** Epoch ms at which the window (and therefore the counter) resets. 0 when clear. */
	windowEndsAt: number;
	/** Milliseconds until `windowEndsAt`. 0 when clear. */
	msRemaining: number;
	firstOpen: number; // Epoch ms, 0 when clear
	lastOpen: number; // Epoch ms, 0 when clear
}

export type RaidStatus = 'ready' | 'locked';

export interface RaidState {
	status: RaidStatus;
	/** Epoch ms at which the raid can be run again. 0 when ready. */
	availableAt: number;
	msRemaining: number;
	completedAt: number; // Epoch ms, 0 when never run
}

export const CLEAR_RANSACK: RansackState = {
	status: 'clear',
	opens: 0,
	opensRemaining: RANSACK_MAX_OPENS,
	windowEndsAt: 0,
	msRemaining: 0,
	firstOpen: 0,
	lastOpen: 0
};

export const READY_RAID: RaidState = {
	status: 'ready',
	availableAt: 0,
	msRemaining: 0,
	completedAt: 0
};

/**
 * Resolve a stored ransack timer against the current time.
 *
 * An elapsed window is reported as `clear` — the stored timer is stale and will be
 * pruned on the next write (see `pruneExpired` in ransackStore).
 */
export function getRansackState(timer: RansackTimer | undefined, now: number): RansackState {
	if (!timer) return CLEAR_RANSACK;

	const firstOpen = Date.parse(timer.firstOpen);
	if (Number.isNaN(firstOpen)) return CLEAR_RANSACK;

	const windowEndsAt = firstOpen + RANSACK_WINDOW_HOURS * HOUR_MS;
	if (now >= windowEndsAt) return CLEAR_RANSACK;

	const opens = Math.max(0, Math.min(timer.opens, RANSACK_MAX_OPENS));
	const opensRemaining = RANSACK_MAX_OPENS - opens;

	let status: RansackStatus;
	if (opensRemaining <= 0) status = 'ransacked';
	else if (opensRemaining <= RANSACK_WARNING_THRESHOLD) status = 'warning';
	else status = 'active';

	return {
		status,
		opens,
		opensRemaining,
		windowEndsAt,
		msRemaining: windowEndsAt - now,
		firstOpen,
		lastOpen: Date.parse(timer.lastOpen) || firstOpen
	};
}

/** Resolve a stored raid lockout against the current time. */
export function getRaidState(timer: RaidTimer | undefined, now: number): RaidState {
	if (!timer) return READY_RAID;

	const completedAt = Date.parse(timer.completedAt);
	if (Number.isNaN(completedAt)) return READY_RAID;

	const availableAt = completedAt + RAID_LOCKOUT_HOURS * HOUR_MS;
	if (now >= availableAt) return { ...READY_RAID, completedAt };

	return {
		status: 'locked',
		availableAt,
		msRemaining: availableAt - now,
		completedAt
	};
}

// --- Quest classification (mirrors DDO Quest Tracker) -----------------------

export function isHeroicQuest(level: number): boolean {
	return level >= 1 && level <= 19;
}

export function isEpicQuest(level: number): boolean {
	return level >= 20 && level <= 29;
}

export function isLegendaryQuest(level: number): boolean {
	return level >= 30;
}

export function getQuestTier(level: number): 'Heroic' | 'Epic' | 'Legendary' {
	if (level >= 30) return 'Legendary';
	if (level >= 20) return 'Epic';
	return 'Heroic';
}

/** Raids are identified by name, not by any field in quests.json. */
export const RAID_QUESTS = [
	'The Chronoscope',
	'The Twilight Forge',
	'The Shroud',
	'The Codex and the Shroud',
	'Legendary Hound of Xoriat',
	"Legendary Tempest's Spine",
	'The Fall of Truth',
	'Caught in the Web',
	'Fire on Thunder Peak',
	'Defiler of the Just',
	'Riding the Storm Out',
	'The Curse of Strahd',
	"Old Baba's Hut",
	'Killing Time',
	'Too Hot to Handle',
	'Project Nemesis',
	'Legendary Vision of Destruction',
	'Legendary Master Artificer',
	'Legendary Lord of Blades',
	'Temple of the Deathwyrm',
	'The Mark of Death',
	'The Dryad and the Demigod',
	'The Lord of Blades',
	'The Master Artificer',
	'The Vault of Night',
	'Hunt or Be Hunted',
	'Skeletons in the Closet',
	'Fire Over Morgrave',
	'Threats Old and New',
	'Den of Vipers',
	'The Chronoscope (Legendary)'
];

export function isRaid(questName: string): boolean {
	return RAID_QUESTS.includes(questName);
}

// --- Sorting and filtering the tracked list ---------------------------------

export type SortBy =
	'name' | 'level' | 'remaining' | 'opens' | 'patron' | 'adventurePack' | 'added';

export interface TrackerFilters {
	/** Narrows the tracked list. Adding a quest uses its own search box. */
	search: string;
	minLevel?: number;
	maxLevel?: number;
	patron: string; // '' = any
	adventurePack: string; // '' = any
	raids: 'all' | 'only' | 'exclude';
	sortBy: SortBy;
	sortOrder: 'asc' | 'desc';
}

export const DEFAULT_FILTERS: TrackerFilters = {
	search: '',
	minLevel: undefined,
	maxLevel: undefined,
	patron: '',
	adventurePack: '',
	raids: 'all',
	// Newest first, so a quest you have just added is waiting at the top for its loot
	// count to be set.
	sortBy: 'added',
	sortOrder: 'desc'
};

/** One character's timers for a quest, as rendered inside a quest card. */
export interface CharacterEntry {
	character: Character;
	ransack: RansackState;
	raid: RaidState;
}

/** A tracked quest with every character's timers underneath it. */
export interface QuestRow {
	quest: Quest;
	isRaid: boolean;
	entries: CharacterEntry[];
	/** Soonest reset across all characters, or MAX_SAFE_INTEGER when nothing is running. */
	soonest: number;
	/** Total times looted across all characters, used for sorting. */
	totalOpens: number;
	/** Position in the player's tracked list, used for the "recently added" sort. */
	addedIndex: number;
}
