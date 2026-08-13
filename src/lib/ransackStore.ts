import { writable, derived, get, readable } from 'svelte/store';
import { base } from '$app/paths';
import { browser } from '$app/environment';
import LZString from 'lz-string';
import {
	CLEAR_RANSACK,
	DEFAULT_FILTERS,
	getRaidState,
	getRansackState,
	isRaid,
	RANSACK_MAX_OPENS,
	type Character,
	type CharacterData,
	type CharacterEntry,
	type Quest,
	type QuestRow,
	type TrackedQuest,
	type TrackerData,
	type TrackerFilters
} from './types';

// --- Storage keys -----------------------------------------------------------

const DATA_KEY = 'ddoransack-data';

// --- Import limits (trust boundary for URL-hash / file data) ----------------

const MAX_HASH_LENGTH = 100_000;
const MAX_DECODED_LENGTH = 500_000;
const MAX_CHARACTERS = 50;
const MAX_TRACKED_QUESTS = 2000;
const MAX_TIMERS_PER_CHARACTER = 2000;
const MAX_NAME_LENGTH = 40;

// --- Clock ------------------------------------------------------------------

/**
 * Ticks every 5 seconds. Everything time-dependent derives from this, so the whole
 * UI shares one interval. 5s is imperceptible on 66-hour and 168-hour countdowns.
 */
export const now = readable(Date.now(), (set) => {
	if (!browser) return;
	const interval = setInterval(() => set(Date.now()), 5000);
	return () => clearInterval(interval);
});

// --- Core stores ------------------------------------------------------------

export const quests = writable<Quest[]>([]);
export const characters = writable<Character[]>([]);
export const characterData = writable<{ [characterId: string]: CharacterData }>({});

/** Quests the player has added, oldest first, each with its attached characters. */
export const trackedQuests = writable<TrackedQuest[]>([]);

export const filters = writable<TrackerFilters>({ ...DEFAULT_FILTERS });

/** Non-null ⇒ the import dialog is shown. */
export const pendingHashImport = writable<TrackerData | null>(null);

export const questsLoaded = writable(false);
export const loadError = writable<string | null>(null);

// --- Loading ----------------------------------------------------------------

export async function loadQuests(): Promise<void> {
	try {
		const response = await fetch(`${base}/quests.json`);
		if (!response.ok) throw new Error(`HTTP ${response.status}`);
		const data: Quest[] = await response.json();
		quests.set(data);
		questsLoaded.set(true);

		// Drop tracked ids that no longer exist in the catalogue, so the list count can
		// never disagree with what is rendered. Only safe once the fetch has succeeded.
		const knownIds = new Set(data.map((quest) => quest.id));
		const tracked = get(trackedQuests);
		if (tracked.some((entry) => !knownIds.has(entry.questId))) {
			trackedQuests.set(tracked.filter((entry) => knownIds.has(entry.questId)));
			persist();
		}
	} catch (error) {
		console.error('Failed to load quests:', error);
		loadError.set('Could not load the quest list. Try reloading the page.');
	}
}

export function loadFromStorage(): void {
	if (!browser) return;

	try {
		const stored = localStorage.getItem(DATA_KEY);
		if (!stored) return;

		const parsed = validateTrackerData(JSON.parse(stored));
		if (!parsed) return;

		characters.set(parsed.characters);
		characterData.set(pruneExpired(parsed.data));
		trackedQuests.set(parsed.tracked);
	} catch (error) {
		console.error('Failed to load tracker data from localStorage:', error);
	}
}

// --- Persistence ------------------------------------------------------------

function currentPayload(): TrackerData {
	return {
		characters: get(characters),
		data: get(characterData),
		tracked: get(trackedQuests)
	};
}

function persist(): void {
	if (!browser) return;
	try {
		localStorage.setItem(DATA_KEY, JSON.stringify(currentPayload()));
	} catch (error) {
		console.error('Failed to save tracker data:', error);
	}
}

/** Drop ransack windows whose 168 hours have elapsed — they carry no information. */
function pruneExpired(data: { [characterId: string]: CharacterData }): {
	[characterId: string]: CharacterData;
} {
	const currentTime = Date.now();
	const result: { [characterId: string]: CharacterData } = {};

	for (const [characterId, entry] of Object.entries(data)) {
		const ransack: CharacterData['ransack'] = {};
		for (const [questId, timer] of Object.entries(entry.ransack ?? {})) {
			if (getRansackState(timer, currentTime).status !== 'clear') {
				ransack[questId] = timer;
			}
		}
		// Raid entries are kept once expired so the UI can show "last run".
		result[characterId] = { ransack, raids: entry.raids ?? {} };
	}

	return result;
}

// --- Characters -------------------------------------------------------------

function newId(): string {
	if (browser && typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
		return crypto.randomUUID();
	}
	return `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function addCharacter(name: string, includeByDefault = true): string | null {
	const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
	if (!trimmed) return null;
	if (get(characters).length >= MAX_CHARACTERS) return null;

	const character: Character = {
		id: newId(),
		name: trimmed,
		createdAt: new Date().toISOString(),
		includeByDefault
	};

	characters.update((list) => [...list, character]);
	characterData.update((data) => ({ ...data, [character.id]: { ransack: {}, raids: {} } }));
	persist();

	return character.id;
}

/**
 * Toggle whether new quests start with this character attached.
 *
 * Deliberately does not touch quests already on the list — turning the flag on is a
 * statement about future quests, not a bulk edit of past ones.
 */
export function setIncludeByDefault(id: string, includeByDefault: boolean): void {
	characters.update((list) =>
		list.map((character) => (character.id === id ? { ...character, includeByDefault } : character))
	);
	persist();
}

export function renameCharacter(id: string, name: string): void {
	const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
	if (!trimmed) return;

	characters.update((list) =>
		list.map((character) => (character.id === id ? { ...character, name: trimmed } : character))
	);
	persist();
}

export function deleteCharacter(id: string): void {
	characters.update((list) => list.filter((character) => character.id !== id));
	characterData.update((data) => {
		const next = { ...data };
		delete next[id];
		return next;
	});
	detachEverywhere(id);
	persist();
}

/** Drop a character from every quest's membership list. Does not persist by itself. */
function detachEverywhere(characterId: string): void {
	trackedQuests.update((list) =>
		list.map((entry) => ({
			...entry,
			characterIds: entry.characterIds.filter((id) => id !== characterId)
		}))
	);
}

/** Wipe every timer for one character, leaving its quest memberships in place. */
export function clearCharacterTimers(characterId: string): void {
	mutate(characterId, () => ({ ransack: {}, raids: {} }));
}

/**
 * Detach a character from every quest on the list, keeping the character itself.
 *
 * Its timers go too — a timer on a quest the character is no longer attached to has
 * no row to display it, so leaving them would strand data the player cannot see.
 */
export function removeCharacterFromAllQuests(characterId: string): void {
	detachEverywhere(characterId);
	mutate(characterId, () => ({ ransack: {}, raids: {} }));
}

// --- The tracked quest list -------------------------------------------------

/** Add a quest, attaching every character flagged to join new quests by default. */
export function trackQuest(questId: string): void {
	const defaults = get(characters)
		.filter((character) => character.includeByDefault)
		.map((character) => character.id);

	trackedQuests.update((list) => {
		if (list.some((entry) => entry.questId === questId)) return list;
		if (list.length >= MAX_TRACKED_QUESTS) return list;
		return [...list, { questId, characterIds: defaults }];
	});
	persist();
}

/** Attach a character to a quest already on the list. */
export function addCharacterToQuest(questId: string, characterId: string): void {
	trackedQuests.update((list) =>
		list.map((entry) =>
			entry.questId === questId && !entry.characterIds.includes(characterId)
				? { ...entry, characterIds: [...entry.characterIds, characterId] }
				: entry
		)
	);
	persist();
}

/** Detach a character from a quest, discarding its timers for that quest. */
export function removeCharacterFromQuest(questId: string, characterId: string): void {
	trackedQuests.update((list) =>
		list.map((entry) =>
			entry.questId === questId
				? { ...entry, characterIds: entry.characterIds.filter((id) => id !== characterId) }
				: entry
		)
	);

	mutate(characterId, (entry) => {
		const ransack = { ...entry.ransack };
		const raids = { ...entry.raids };
		delete ransack[questId];
		delete raids[questId];
		return { ransack, raids };
	});
}

/** Remove a quest from the list, along with every character's timers for it. */
export function untrackQuest(questId: string): void {
	trackedQuests.update((list) => list.filter((entry) => entry.questId !== questId));

	characterData.update((data) => {
		const next: { [characterId: string]: CharacterData } = {};
		for (const [characterId, entry] of Object.entries(data)) {
			const ransack = { ...entry.ransack };
			const raids = { ...entry.raids };
			delete ransack[questId];
			delete raids[questId];
			next[characterId] = { ransack, raids };
		}
		return next;
	});

	persist();
}

// --- Timer mutations --------------------------------------------------------

function mutate(characterId: string, fn: (entry: CharacterData) => CharacterData): void {
	characterData.update((data) => {
		const entry = data[characterId] ?? { ransack: {}, raids: {} };
		return { ...data, [characterId]: fn(entry) };
	});
	persist();
}

/**
 * Record a chest loot.
 *
 * If no window is running (or the previous one has elapsed) this starts a fresh
 * 168-hour window. Otherwise it only increments the counter — later loots never
 * extend the window.
 */
export function logOpen(characterId: string, questId: string, when: number = Date.now()): void {
	const iso = new Date(when).toISOString();

	mutate(characterId, (entry) => {
		const existing = entry.ransack[questId];
		const state = getRansackState(existing, when);

		const timer =
			state.status === 'clear'
				? { firstOpen: iso, opens: 1, lastOpen: iso }
				: {
						firstOpen: existing.firstOpen,
						opens: Math.min(existing.opens + 1, RANSACK_MAX_OPENS),
						lastOpen: iso
					};

		return { ...entry, ransack: { ...entry.ransack, [questId]: timer } };
	});
}

/** Undo a loot. Dropping to zero removes the window, since the first loot defines it. */
export function undoOpen(characterId: string, questId: string): void {
	mutate(characterId, (entry) => {
		const existing = entry.ransack[questId];
		if (!existing) return entry;

		const ransack = { ...entry.ransack };
		if (existing.opens <= 1) {
			delete ransack[questId];
		} else {
			ransack[questId] = { ...existing, opens: existing.opens - 1 };
		}
		return { ...entry, ransack };
	});
}

/** Manual correction: set the window's start time and/or loot count directly. */
export function editTimer(
	characterId: string,
	questId: string,
	firstOpenMs: number,
	opens: number
): void {
	const clampedOpens = Math.max(0, Math.min(Math.round(opens), RANSACK_MAX_OPENS));

	mutate(characterId, (entry) => {
		const ransack = { ...entry.ransack };
		if (clampedOpens === 0 || !Number.isFinite(firstOpenMs)) {
			delete ransack[questId];
		} else {
			const iso = new Date(firstOpenMs).toISOString();
			const existingLast = entry.ransack[questId]?.lastOpen;
			const lastOpen = existingLast && Date.parse(existingLast) >= firstOpenMs ? existingLast : iso;
			ransack[questId] = { firstOpen: iso, opens: clampedOpens, lastOpen };
		}
		return { ...entry, ransack };
	});
}

/**
 * Set the loot count directly — what clicking a pip does.
 *
 * With a window already running the anchor is left alone, so the countdown does not
 * move. With no window running, this starts one now with that many loots already used,
 * which is the sane reading of "I've looted this 3 times".
 */
export function setOpens(characterId: string, questId: string, opens: number): void {
	const clamped = Math.max(0, Math.min(Math.round(opens), RANSACK_MAX_OPENS));

	mutate(characterId, (entry) => {
		const ransack = { ...entry.ransack };

		if (clamped === 0) {
			delete ransack[questId];
			return { ...entry, ransack };
		}

		const existing = entry.ransack[questId];
		const running = getRansackState(existing, Date.now()).status !== 'clear';
		const iso = new Date().toISOString();

		ransack[questId] = running
			? { ...existing, opens: clamped, lastOpen: iso }
			: { firstOpen: iso, opens: clamped, lastOpen: iso };

		return { ...entry, ransack };
	});
}

export function clearRansack(characterId: string, questId: string): void {
	mutate(characterId, (entry) => {
		const ransack = { ...entry.ransack };
		delete ransack[questId];
		return { ...entry, ransack };
	});
}

export function logRaid(characterId: string, questId: string, when: number = Date.now()): void {
	mutate(characterId, (entry) => ({
		...entry,
		raids: { ...entry.raids, [questId]: { completedAt: new Date(when).toISOString() } }
	}));
}

export function clearRaid(characterId: string, questId: string): void {
	mutate(characterId, (entry) => {
		const raids = { ...entry.raids };
		delete raids[questId];
		return { ...entry, raids };
	});
}

// --- Derived state ----------------------------------------------------------

export const questsById = derived(
	quests,
	($quests) => new Map($quests.map((quest) => [quest.id, quest]))
);

/** Every distinct patron in the quest data, sorted. */
export const patrons = derived(quests, ($quests) =>
	[...new Set($quests.map((quest) => quest.patron))].filter(Boolean).sort()
);

/** Every distinct adventure pack in the quest data, sorted. */
export const adventurePacks = derived(quests, ($quests) =>
	[...new Set($quests.map((quest) => quest.adventurePack))].filter(Boolean).sort()
);

/**
 * The tracked quests, each with a section per attached character, plus the characters
 * that are not attached so the card can offer them as "add to quest" buttons.
 *
 * Characters keep their creation order inside a card rather than the order they were
 * attached, so the same names sit in the same place on every quest.
 */
const allRows = derived(
	[trackedQuests, questsById, characters, characterData, now],
	([$tracked, $questsById, $characters, $data, $now]): QuestRow[] =>
		$tracked
			.map(({ questId, characterIds }, addedIndex) => {
				const quest = $questsById.get(questId);
				if (!quest) return null;

				const questIsRaid = isRaid(quest.name);
				const attached = new Set(characterIds);
				const entries: CharacterEntry[] = [];
				const available: Character[] = [];
				let soonest = Number.MAX_SAFE_INTEGER;
				let totalOpens = 0;

				for (const character of $characters) {
					if (!attached.has(character.id)) {
						available.push(character);
						continue;
					}

					const entry = $data[character.id];
					// Raids have no chest-ransack counter, only a lockout. Forcing the state
					// clear here means stats and countdowns can never report a chest timer
					// that no raid card would ever render.
					const ransack = questIsRaid
						? CLEAR_RANSACK
						: getRansackState(entry?.ransack[questId], $now);
					const raid = getRaidState(entry?.raids[questId], $now);

					totalOpens += ransack.opens;
					if (ransack.status !== 'clear') soonest = Math.min(soonest, ransack.msRemaining);
					if (raid.status === 'locked') soonest = Math.min(soonest, raid.msRemaining);

					entries.push({ character, ransack, raid });
				}

				return {
					quest,
					isRaid: questIsRaid,
					entries,
					available,
					soonest,
					totalOpens,
					addedIndex
				};
			})
			.filter((row): row is QuestRow => row !== null)
);

export const questRows = derived([allRows, filters], ([$rows, $filters]): QuestRow[] =>
	sortRows(
		$rows.filter((row) => matches(row, $filters)),
		$filters
	)
);

function matches(row: QuestRow, activeFilters: TrackerFilters): boolean {
	const { quest } = row;

	if (activeFilters.search) {
		const needle = activeFilters.search.toLowerCase();
		const haystack = `${quest.name} ${quest.patron} ${quest.adventurePack}`.toLowerCase();
		if (!haystack.includes(needle)) return false;
	}

	if (activeFilters.minLevel !== undefined && quest.level < activeFilters.minLevel) return false;
	if (activeFilters.maxLevel !== undefined && quest.level > activeFilters.maxLevel) return false;
	if (activeFilters.patron && quest.patron !== activeFilters.patron) return false;
	if (activeFilters.adventurePack && quest.adventurePack !== activeFilters.adventurePack) {
		return false;
	}

	if (activeFilters.raids === 'only' && !row.isRaid) return false;
	if (activeFilters.raids === 'exclude' && row.isRaid) return false;

	return true;
}

function sortRows(rows: QuestRow[], activeFilters: TrackerFilters): QuestRow[] {
	const direction = activeFilters.sortOrder === 'desc' ? -1 : 1;

	return [...rows].sort((a, b) => {
		let comparison = 0;

		switch (activeFilters.sortBy) {
			case 'level':
				comparison = a.quest.level - b.quest.level;
				break;
			case 'opens':
				comparison = a.totalOpens - b.totalOpens;
				break;
			case 'remaining':
				// Quests with nothing running sink to the bottom either way.
				comparison = a.soonest - b.soonest;
				break;
			case 'patron':
				comparison = a.quest.patron.localeCompare(b.quest.patron);
				break;
			case 'adventurePack':
				comparison = a.quest.adventurePack.localeCompare(b.quest.adventurePack);
				break;
			case 'added':
				comparison = a.addedIndex - b.addedIndex;
				break;
			default:
				comparison = a.quest.name.localeCompare(b.quest.name);
		}

		if (comparison !== 0) return comparison * direction;
		return a.quest.name.localeCompare(b.quest.name);
	});
}

/** Headline numbers across every character. */
export const overallStats = derived(allRows, ($rows) => {
	let running = 0;
	let warning = 0;
	let ransacked = 0;
	let raidsLocked = 0;
	let nextReset = Number.POSITIVE_INFINITY;

	for (const row of $rows) {
		for (const entry of row.entries) {
			if (entry.ransack.status !== 'clear') {
				if (entry.ransack.status === 'ransacked') ransacked++;
				else if (entry.ransack.status === 'warning') warning++;
				else running++;
				nextReset = Math.min(nextReset, entry.ransack.msRemaining);
			}
			if (entry.raid.status === 'locked') {
				raidsLocked++;
				nextReset = Math.min(nextReset, entry.raid.msRemaining);
			}
		}
	}

	return {
		quests: $rows.length,
		timers: running + warning + ransacked,
		running,
		warning,
		ransacked,
		raidsLocked,
		nextReset: Number.isFinite(nextReset) ? nextReset : 0
	};
});

export interface CharacterSummary {
	character: Character;
	tracked: number;
	ransacked: number;
	warning: number;
	raidsLocked: number;
	nextReset: number;
}

/**
 * Per-character counts for the character panel. Derived from the same rows the list
 * renders, so a character's badges always agree with what is on screen.
 */
export const characterSummaries = derived(
	[characters, allRows],
	([$characters, $rows]): CharacterSummary[] => {
		const summaries = new Map<string, CharacterSummary>(
			$characters.map((character) => [
				character.id,
				{
					character,
					tracked: 0,
					ransacked: 0,
					warning: 0,
					raidsLocked: 0,
					nextReset: Number.POSITIVE_INFINITY
				}
			])
		);

		for (const row of $rows) {
			for (const entry of row.entries) {
				const summary = summaries.get(entry.character.id);
				if (!summary) continue;

				if (entry.ransack.status !== 'clear') {
					summary.tracked++;
					if (entry.ransack.status === 'ransacked') summary.ransacked++;
					if (entry.ransack.status === 'warning') summary.warning++;
					summary.nextReset = Math.min(summary.nextReset, entry.ransack.msRemaining);
				}

				if (entry.raid.status === 'locked') {
					summary.raidsLocked++;
					summary.nextReset = Math.min(summary.nextReset, entry.raid.msRemaining);
				}
			}
		}

		return [...summaries.values()].map((summary) => ({
			...summary,
			nextReset: Number.isFinite(summary.nextReset) ? summary.nextReset : 0
		}));
	}
);

export interface UpcomingReset {
	character: Character;
	quest: Quest;
	kind: 'ransack' | 'raid';
	msRemaining: number;
	at: number;
}

/** The next timers to come back across every character — the "what's next" panel. */
export const upcomingResets = derived(allRows, ($rows): UpcomingReset[] => {
	const results: UpcomingReset[] = [];

	for (const row of $rows) {
		for (const entry of row.entries) {
			if (entry.ransack.status !== 'clear') {
				results.push({
					character: entry.character,
					quest: row.quest,
					kind: 'ransack',
					msRemaining: entry.ransack.msRemaining,
					at: entry.ransack.windowEndsAt
				});
			}
			if (entry.raid.status === 'locked') {
				results.push({
					character: entry.character,
					quest: row.quest,
					kind: 'raid',
					msRemaining: entry.raid.msRemaining,
					at: entry.raid.availableAt
				});
			}
		}
	}

	return results.sort((a, b) => a.msRemaining - b.msRemaining);
});

// --- Filters ----------------------------------------------------------------

export function updateFilters(partial: Partial<TrackerFilters>): void {
	filters.update((current) => ({ ...current, ...partial }));
}

export function resetFilters(): void {
	filters.set({ ...DEFAULT_FILTERS });
}

// --- Export / import --------------------------------------------------------

export function exportToHash(): string {
	return LZString.compressToEncodedURIComponent(JSON.stringify(currentPayload()));
}

export function exportShareUrl(): string {
	if (!browser) return '';
	const { origin, pathname } = window.location;
	return `${origin}${pathname}#${exportToHash()}`;
}

export function exportToJson(): string {
	return JSON.stringify(currentPayload(), null, 2);
}

export function checkForHashImport(): void {
	if (!browser) return;

	const hash = window.location.hash.slice(1);
	if (!hash || hash.length > MAX_HASH_LENGTH) return;

	try {
		const decoded = LZString.decompressFromEncodedURIComponent(hash);
		if (!decoded || decoded.length > MAX_DECODED_LENGTH) return;

		const parsed = validateTrackerData(JSON.parse(decoded));
		if (parsed) pendingHashImport.set(parsed);
	} catch (error) {
		console.error('Failed to parse shared data from the URL:', error);
	} finally {
		history.replaceState(null, '', window.location.pathname + window.location.search);
	}
}

export function importFromHash(merge: boolean): void {
	const payload = get(pendingHashImport);
	if (payload) applyImport(payload, merge);
	pendingHashImport.set(null);
}

export function cancelHashImport(): void {
	pendingHashImport.set(null);
}

export function importFromJson(text: string, merge: boolean): string | null {
	if (text.length > MAX_DECODED_LENGTH) return 'That file is too large to be tracker data.';

	let parsed: unknown;
	try {
		parsed = JSON.parse(text);
	} catch {
		return 'That file is not valid JSON.';
	}

	const payload = validateTrackerData(parsed);
	if (!payload) return 'That file does not look like DDO Ransack Tracker data.';

	applyImport(payload, merge);
	return null;
}

/**
 * Apply imported data.
 *
 * Replace swaps everything out. Merge matches characters on name (case-insensitive)
 * and keeps whichever copy of each timer was touched most recently, so importing an
 * older backup never rewinds a live timer.
 */
function applyImport(payload: TrackerData, merge: boolean): void {
	if (!merge) {
		characters.set(payload.characters);
		characterData.set(pruneExpired(payload.data));
		trackedQuests.set(payload.tracked);
		persist();
		return;
	}

	const mergedCharacters = [...get(characters)];
	const mergedData = { ...get(characterData) };
	const keyOf = (character: Character) => character.name.toLowerCase();
	const existingByKey = new Map(mergedCharacters.map((character) => [keyOf(character), character]));
	// Incoming character id → the id it ended up under here, so the incoming quest
	// membership lists can be rewritten to point at the right characters.
	const idMap = new Map<string, string>();

	for (const incoming of payload.characters) {
		if (mergedCharacters.length >= MAX_CHARACTERS) break;

		const match = existingByKey.get(keyOf(incoming));
		const incomingData = payload.data[incoming.id] ?? { ransack: {}, raids: {} };

		if (match) {
			idMap.set(incoming.id, match.id);
			mergedData[match.id] = mergeCharacterData(
				mergedData[match.id] ?? { ransack: {}, raids: {} },
				incomingData
			);
		} else {
			const id = mergedCharacters.some((character) => character.id === incoming.id)
				? newId()
				: incoming.id;
			const character = { ...incoming, id };
			idMap.set(incoming.id, id);
			mergedCharacters.push(character);
			existingByKey.set(keyOf(character), character);
			mergedData[id] = incomingData;
		}
	}

	characters.set(mergedCharacters);
	characterData.set(pruneExpired(mergedData));
	trackedQuests.update((list) => {
		const merged = list.map((entry) => ({ ...entry, characterIds: [...entry.characterIds] }));
		const byQuestId = new Map(merged.map((entry) => [entry.questId, entry]));

		for (const incoming of payload.tracked) {
			const characterIds = incoming.characterIds
				.map((characterId) => idMap.get(characterId))
				.filter((characterId): characterId is string => characterId !== undefined);

			const existing = byQuestId.get(incoming.questId);
			if (existing) {
				for (const characterId of characterIds) {
					if (!existing.characterIds.includes(characterId)) existing.characterIds.push(characterId);
				}
			} else if (merged.length < MAX_TRACKED_QUESTS) {
				const entry = { questId: incoming.questId, characterIds };
				merged.push(entry);
				byQuestId.set(entry.questId, entry);
			}
		}

		return merged;
	});
	persist();
}

function mergeCharacterData(existing: CharacterData, incoming: CharacterData): CharacterData {
	const ransack = { ...existing.ransack };
	for (const [questId, timer] of Object.entries(incoming.ransack)) {
		const current = ransack[questId];
		if (!current || Date.parse(timer.lastOpen) > Date.parse(current.lastOpen)) {
			ransack[questId] = timer;
		}
	}

	const raids = { ...existing.raids };
	for (const [questId, timer] of Object.entries(incoming.raids)) {
		const current = raids[questId];
		if (!current || Date.parse(timer.completedAt) > Date.parse(current.completedAt)) {
			raids[questId] = timer;
		}
	}

	return { ransack, raids };
}

/** Remove every tracked quest and its timers, leaving the characters in place. */
export function resetQuests(): void {
	trackedQuests.set([]);
	characterData.update((data) => {
		const next: { [characterId: string]: CharacterData } = {};
		for (const characterId of Object.keys(data)) {
			next[characterId] = { ransack: {}, raids: {} };
		}
		return next;
	});
	persist();
}

export function resetAll(): void {
	characters.set([]);
	characterData.set({});
	trackedQuests.set([]);
	persist();
}

// --- Validation (trust boundary) --------------------------------------------

function isIsoDate(value: unknown): value is string {
	return typeof value === 'string' && value.length <= 40 && !Number.isNaN(Date.parse(value));
}

function safeString(value: unknown, maxLength: number): string | null {
	if (typeof value !== 'string') return null;
	return value.slice(0, maxLength);
}

/**
 * Validate externally-supplied data (URL hash or an uploaded file) into a
 * `TrackerData`, discarding anything malformed. Returns null if nothing usable.
 *
 * Any quest that has a timer is folded into the tracked list, so imported data can
 * never contain a timer with no card to show it on.
 */
export function validateTrackerData(input: unknown): TrackerData | null {
	if (!input || typeof input !== 'object') return null;

	const raw = input as { characters?: unknown; data?: unknown; tracked?: unknown };
	if (!Array.isArray(raw.characters) || !raw.data || typeof raw.data !== 'object') return null;

	const validCharacters: Character[] = [];
	for (const item of raw.characters.slice(0, MAX_CHARACTERS)) {
		if (!item || typeof item !== 'object') continue;
		const candidate = item as Record<string, unknown>;

		const id = safeString(candidate.id, 64);
		const name = safeString(candidate.name, MAX_NAME_LENGTH);
		if (!id || !name) continue;

		validCharacters.push({
			id,
			name,
			createdAt: isIsoDate(candidate.createdAt) ? candidate.createdAt : new Date().toISOString(),
			includeByDefault: candidate.includeByDefault !== false
		});
	}

	if (validCharacters.length === 0) return null;

	const knownIds = new Set(validCharacters.map((character) => character.id));
	const validData: { [characterId: string]: CharacterData } = {};
	/** Quest id → the characters that have a timer for it, used to backfill membership. */
	const timerOwners = new Map<string, Set<string>>();
	const noteTimer = (questId: string, characterId: string) => {
		const owners = timerOwners.get(questId) ?? new Set<string>();
		owners.add(characterId);
		timerOwners.set(questId, owners);
	};

	for (const [characterId, entry] of Object.entries(raw.data as Record<string, unknown>)) {
		if (!knownIds.has(characterId) || !entry || typeof entry !== 'object') continue;

		const source = entry as { ransack?: unknown; raids?: unknown };
		const ransack: CharacterData['ransack'] = {};
		const raids: CharacterData['raids'] = {};
		let count = 0;

		if (source.ransack && typeof source.ransack === 'object') {
			for (const [questId, timer] of Object.entries(source.ransack as Record<string, unknown>)) {
				if (count >= MAX_TIMERS_PER_CHARACTER) break;
				if (!timer || typeof timer !== 'object') continue;

				const candidate = timer as Record<string, unknown>;
				if (!isIsoDate(candidate.firstOpen)) continue;
				if (typeof candidate.opens !== 'number' || !Number.isFinite(candidate.opens)) continue;

				const key = questId.slice(0, 80);
				const opens = Math.max(1, Math.min(Math.round(candidate.opens), RANSACK_MAX_OPENS));
				ransack[key] = {
					firstOpen: candidate.firstOpen,
					opens,
					lastOpen: isIsoDate(candidate.lastOpen) ? candidate.lastOpen : candidate.firstOpen
				};
				noteTimer(key, characterId);
				count++;
			}
		}

		if (source.raids && typeof source.raids === 'object') {
			for (const [questId, timer] of Object.entries(source.raids as Record<string, unknown>)) {
				if (count >= MAX_TIMERS_PER_CHARACTER) break;
				if (!timer || typeof timer !== 'object') continue;

				const candidate = timer as Record<string, unknown>;
				if (!isIsoDate(candidate.completedAt)) continue;

				const key = questId.slice(0, 80);
				raids[key] = { completedAt: candidate.completedAt };
				noteTimer(key, characterId);
				count++;
			}
		}

		validData[characterId] = { ransack, raids };
	}

	const tracked: TrackedQuest[] = [];
	const byQuestId = new Map<string, TrackedQuest>();

	for (const value of Array.isArray(raw.tracked) ? (raw.tracked as unknown[]) : []) {
		// A bare string is the pre-membership format: attach every character, which is
		// what that data meant at the time it was written.
		const isLegacy = typeof value === 'string';
		const candidate = (isLegacy ? {} : (value ?? {})) as {
			questId?: unknown;
			characterIds?: unknown;
		};

		const questId = safeString(isLegacy ? value : candidate.questId, 80);
		if (!questId || byQuestId.has(questId) || tracked.length >= MAX_TRACKED_QUESTS) continue;

		const rawIds: unknown[] = isLegacy
			? [...knownIds]
			: Array.isArray(candidate.characterIds)
				? candidate.characterIds
				: [];

		const characterIds: string[] = [];
		for (const candidate of rawIds) {
			const characterId = safeString(candidate, 64);
			if (characterId && knownIds.has(characterId) && !characterIds.includes(characterId)) {
				characterIds.push(characterId);
			}
		}

		const entry = { questId, characterIds };
		tracked.push(entry);
		byQuestId.set(questId, entry);
	}

	// A timer with no card to show it on is unreachable, so fold its owner in.
	for (const [questId, owners] of timerOwners) {
		const entry = byQuestId.get(questId);
		if (entry) {
			for (const characterId of owners) {
				if (!entry.characterIds.includes(characterId)) entry.characterIds.push(characterId);
			}
		} else if (tracked.length < MAX_TRACKED_QUESTS) {
			const added = { questId, characterIds: [...owners] };
			tracked.push(added);
			byQuestId.set(questId, added);
		}
	}

	return { characters: validCharacters, data: validData, tracked };
}
