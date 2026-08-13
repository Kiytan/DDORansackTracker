<script lang="ts">
	import Countdown from './Countdown.svelte';
	import OpenPips from './OpenPips.svelte';
	import TierBadge from './TierBadge.svelte';
	import {
		addCharacterToQuest,
		clearRaid,
		clearRansack,
		editTimer,
		logOpen,
		logRaid,
		removeCharacterFromQuest,
		setOpens,
		undoOpen,
		untrackQuest
	} from './ransackStore';
	import { formatShortDateTime, fromDateTimeLocal, toDateTimeLocal } from './time';
	import { getQuestTier, RANSACK_MAX_OPENS, type CharacterEntry, type QuestRow } from './types';

	export let row: QuestRow;

	/** Character id whose editor is open, or null. One at a time per card. */
	let editingCharacterId: string | null = null;
	let editFirstOpen = '';
	let editRaidAt = '';
	let confirmRemove = false;
	/** Character id awaiting confirmation of removal from this quest, or null. */
	let confirmDetachId: string | null = null;
	/** True while the open editor's timer was created by opening it, not by the player. */
	let autoCreated = false;

	$: ({ quest } = row);
	$: tier = getQuestTier(quest.level);

	function openEditor(entry: CharacterEntry) {
		editingCharacterId = entry.character.id;
		autoCreated = false;
		editFirstOpen = toDateTimeLocal(entry.ransack.firstOpen || Date.now());
		editRaidAt = toDateTimeLocal(entry.raid.completedAt || Date.now());
	}

	function toggleEditor(entry: CharacterEntry) {
		if (editingCharacterId === entry.character.id) {
			closeEditor(entry);
			return;
		}

		// Nothing running yet: opening the editor is a statement of intent, so start the
		// window at now with one loot rather than making the user click a pip first.
		// `editFirstOpen` is set here rather than read back from the entry, which is
		// still the pre-mutation value at this point.
		if (!row.isRaid && entry.ransack.status === 'clear') {
			setOpens(entry.character.id, quest.id, 1);
			editingCharacterId = entry.character.id;
			editFirstOpen = nowValue();
			autoCreated = true;
			return;
		}

		openEditor(entry);
	}

	/** Cancelling an auto-created timer undoes it, so ✎ is safe to open and back out of. */
	function closeEditor(entry?: CharacterEntry) {
		if (autoCreated && entry) clearRansack(entry.character.id, quest.id);
		autoCreated = false;
		editingCharacterId = null;
	}

	function nowValue(): string {
		return toDateTimeLocal(Date.now());
	}

	/** Nudge a datetime-local value by whole hours, falling back to now if it is unset. */
	function shiftHours(value: string, hours: number): string {
		const base = fromDateTimeLocal(value);
		const from = Number.isFinite(base) ? base : Date.now();
		return toDateTimeLocal(from + hours * 60 * 60 * 1000);
	}

	function saveRansackEdit(entry: CharacterEntry) {
		// The loot count is set with the pips, so only the anchor moves here.
		editTimer(entry.character.id, quest.id, fromDateTimeLocal(editFirstOpen), entry.ransack.opens);
		autoCreated = false;
		editingCharacterId = null;
	}

	function saveRaidEdit(entry: CharacterEntry) {
		const when = fromDateTimeLocal(editRaidAt);
		if (Number.isFinite(when)) logRaid(entry.character.id, quest.id, when);
		autoCreated = false;
		editingCharacterId = null;
	}

	/** Any deliberate pip click makes the timer the player's, not the editor's to undo. */
	function handleSetOpens(entry: CharacterEntry, value: number) {
		autoCreated = false;
		setOpens(entry.character.id, quest.id, value);
	}

	function detach(characterId: string) {
		if (editingCharacterId === characterId) editingCharacterId = null;
		autoCreated = false;
		confirmDetachId = null;
		removeCharacterFromQuest(quest.id, characterId);
	}
</script>

<article class="card">
	<header>
		<span class="level {tier.toLowerCase()}" title="{tier} · level {quest.level}">
			{quest.level}
		</span>
		<span class="name">{quest.name}</span>
		<TierBadge level={quest.level} />
		{#if row.isRaid}
			<span class="raid-badge">Raid</span>
		{/if}
		<span class="meta">{quest.patron} · {quest.adventurePack}</span>

		{#if confirmRemove}
			<span class="confirm">
				<button class="danger" on:click={() => untrackQuest(quest.id)}
					>Remove &amp; delete timers</button
				>
				<button class="ghost" on:click={() => (confirmRemove = false)}>Cancel</button>
			</span>
		{:else}
			<button
				class="remove"
				title="Remove {quest.name} from your list"
				aria-label="Remove {quest.name} from your list"
				on:click={() => (confirmRemove = true)}
			>
				×
			</button>
		{/if}
	</header>

	{#if row.entries.length === 0}
		<p class="no-characters">
			{row.available.length > 0
				? 'No characters attached to this quest yet — add one below.'
				: `Add a character to start recording ${row.isRaid ? 'raid completions' : 'loots'} for this quest.`}
		</p>
	{:else}
		<ul class="characters">
			{#each row.entries as entry (entry.character.id)}
				{@const ransack = entry.ransack}
				{@const raid = entry.raid}
				{@const editing = editingCharacterId === entry.character.id}

				{#if row.isRaid}
					<!-- Raids have no chest ransack counter — only the lockout. -->
					<li class="entry raid-entry" class:locked={raid.status === 'locked'}>
						<div class="entry-main">
							<span class="character">{entry.character.name}</span>

							<span class="status-cell raid-{raid.status}">
								{#if raid.status === 'locked'}
									On lockout · ready in
									<Countdown ms={raid.msRemaining} at={raid.availableAt} label="Available" />
								{:else}
									Ready{raid.completedAt
										? ` · last run ${formatShortDateTime(raid.completedAt)}`
										: ' · never run'}
								{/if}
							</span>

							<span class="entry-actions">
								{#if raid.status === 'locked'}
									<button
										class="ghost"
										title="Clear the lockout for {entry.character.name}"
										on:click={() => clearRaid(entry.character.id, quest.id)}
									>
										Clear lockout
									</button>
								{:else}
									<button
										class="loot-btn"
										title="Record a raid completion for {entry.character.name}"
										on:click={() => logRaid(entry.character.id, quest.id)}
									>
										Ran the raid
									</button>
								{/if}
								<button
									class="icon-btn"
									title="Edit the completion time"
									aria-label="Edit raid time for {entry.character.name}"
									aria-expanded={editing}
									disabled={!raid.completedAt}
									on:click={() => toggleEditor(entry)}
								>
									✎
								</button>
								<button
									class="detach-btn"
									title="Remove {entry.character.name} from this quest"
									aria-label="Remove {entry.character.name} from this quest"
									on:click={() => (confirmDetachId = entry.character.id)}
								>
									×
								</button>
							</span>
						</div>

						{#if confirmDetachId === entry.character.id}
							<div class="detach-confirm">
								<span>Remove {entry.character.name} from this quest?</span>
								<button class="danger" on:click={() => detach(entry.character.id)}>Remove</button>
								<button class="ghost" on:click={() => (confirmDetachId = null)}>Cancel</button>
							</div>
						{/if}

						{#if editing}
							<form class="editor" on:submit|preventDefault={() => saveRaidEdit(entry)}>
								<label>
									<span>Raid completed</span>
									<input type="datetime-local" bind:value={editRaidAt} />
								</label>

								<div class="editor-actions">
									<span class="nudge-group">
										<button type="button" class="ghost" on:click={() => (editRaidAt = nowValue())}>
											Now
										</button>
										<button
											type="button"
											class="ghost"
											on:click={() => (editRaidAt = shiftHours(editRaidAt, -1))}
										>
											−1 hour
										</button>
										<button
											type="button"
											class="ghost"
											on:click={() => (editRaidAt = shiftHours(editRaidAt, 1))}
										>
											+1 hour
										</button>
									</span>

									<span class="save-group">
										<button type="submit" class="primary">Save</button>
										<button type="button" class="ghost" on:click={() => closeEditor(entry)}>
											Cancel
										</button>
										<button
											type="button"
											class="danger-outline"
											on:click={() => {
												clearRaid(entry.character.id, quest.id);
												editingCharacterId = null;
											}}
										>
											Clear lockout
										</button>
									</span>
								</div>

								<p class="hint">Lockouts run for 2 days 18 hours from the completion.</p>
							</form>
						{/if}
					</li>
				{:else}
					<li class="entry {ransack.status}">
						<div class="entry-main">
							<span class="character">{entry.character.name}</span>

							<span class="pips-cell">
								<OpenPips
									opens={ransack.opens}
									status={ransack.status}
									label={entry.character.name}
									onSet={(value) => handleSetOpens(entry, value)}
								/>
								<span class="opens-text">{ransack.opens}/{RANSACK_MAX_OPENS}</span>
							</span>

							<span class="status-cell {ransack.status}">
								{#if ransack.status === 'clear'}
									No timer running
								{:else if ransack.status === 'ransacked'}
									Ransacked · resets in
									<Countdown ms={ransack.msRemaining} at={ransack.windowEndsAt} />
								{:else}
									{ransack.opensRemaining} left · resets in
									<Countdown ms={ransack.msRemaining} at={ransack.windowEndsAt} />
								{/if}
							</span>

							<span class="entry-actions">
								<button
									class="count-btn"
									disabled={ransack.opens === 0}
									title="Undo one loot"
									aria-label="Undo one loot for {entry.character.name}"
									on:click={() => undoOpen(entry.character.id, quest.id)}
								>
									−
								</button>
								<button
									class="count-btn"
									disabled={ransack.status === 'ransacked'}
									title={ransack.status === 'ransacked'
										? 'Ransacked — no named loot until the window resets'
										: `Record a chest loot for ${entry.character.name}`}
									aria-label="Record a chest loot for {entry.character.name}"
									on:click={() => logOpen(entry.character.id, quest.id)}
								>
									+
								</button>
								<button
									class="icon-btn"
									title={ransack.status === 'clear'
										? 'Start a timer at one loot and set the time'
										: 'Edit or clear this timer'}
									aria-label="Edit timer for {entry.character.name}"
									aria-expanded={editing}
									on:click={() => toggleEditor(entry)}
								>
									✎
								</button>
								<button
									class="detach-btn"
									title="Remove {entry.character.name} from this quest"
									aria-label="Remove {entry.character.name} from this quest"
									on:click={() => (confirmDetachId = entry.character.id)}
								>
									×
								</button>
							</span>
						</div>

						{#if confirmDetachId === entry.character.id}
							<div class="detach-confirm">
								<span
									>Remove {entry.character.name} from this quest? Their timers for it go too.</span
								>
								<button class="danger" on:click={() => detach(entry.character.id)}>Remove</button>
								<button class="ghost" on:click={() => (confirmDetachId = null)}>Cancel</button>
							</div>
						{/if}

						{#if editing}
							<form class="editor" on:submit|preventDefault={() => saveRansackEdit(entry)}>
								<label>
									<span>First loot (starts the 168h window)</span>
									<input type="datetime-local" bind:value={editFirstOpen} />
								</label>

								<div class="editor-actions">
									<span class="nudge-group">
										<button
											type="button"
											class="ghost"
											on:click={() => (editFirstOpen = nowValue())}
										>
											Now
										</button>
										<button
											type="button"
											class="ghost"
											on:click={() => (editFirstOpen = shiftHours(editFirstOpen, -1))}
										>
											−1 hour
										</button>
										<button
											type="button"
											class="ghost"
											on:click={() => (editFirstOpen = shiftHours(editFirstOpen, 1))}
										>
											+1 hour
										</button>
									</span>

									<span class="save-group">
										<button type="submit" class="primary">Save</button>
										<button type="button" class="ghost" on:click={() => closeEditor(entry)}>
											Cancel
										</button>
										<button
											type="button"
											class="danger-outline"
											on:click={() => {
												clearRansack(entry.character.id, quest.id);
												autoCreated = false;
												editingCharacterId = null;
											}}
										>
											Clear timer
										</button>
									</span>
								</div>

								<p class="hint">
									Moving the first loot moves the reset. The loot count is set with the pips.
								</p>
							</form>
						{/if}
					</li>
				{/if}
			{/each}
		</ul>
	{/if}

	{#if row.available.length > 0}
		<div class="add-characters">
			<span class="add-label">Add to this quest:</span>
			{#each row.available as character (character.id)}
				<button
					class="add-character-btn"
					title="Add {character.name} to {quest.name}"
					on:click={() => addCharacterToQuest(quest.id, character.id)}
				>
					+ {character.name}
				</button>
			{/each}
		</div>
	{/if}
</article>

<style>
	.card {
		background: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 4px;
		padding: 0.6rem 0.75rem;
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
		margin-bottom: 0.45rem;
	}

	.level {
		flex-shrink: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 24px;
		height: 20px;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 700;
		background: #3a3a3a;
		color: #e0e0e0;
	}

	.level.epic {
		background: rgba(168, 85, 247, 0.2);
		color: #c084fc;
	}

	.level.legendary {
		background: rgba(234, 88, 12, 0.2);
		color: #fb923c;
	}

	.name {
		color: white;
		font-weight: 600;
	}

	.raid-badge {
		flex-shrink: 0;
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		background: rgba(74, 158, 255, 0.15);
		color: #4a9eff;
		border: 1px solid rgba(74, 158, 255, 0.4);
		border-radius: 3px;
		padding: 0.05rem 0.35rem;
	}

	.meta {
		font-size: 0.75rem;
		color: #888;
		margin-left: auto;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remove {
		flex-shrink: 0;
		background: none;
		border: none;
		color: #666;
		font-size: 1.1rem;
		line-height: 1;
		padding: 0 0.2rem;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.remove:hover {
		color: #e4606d;
	}

	.confirm {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.characters {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.entry {
		background: #16181d;
		border-left: 3px solid #404040;
		border-radius: 3px;
		padding: 0.4rem 0.5rem;
	}

	.entry.active {
		border-left-color: #28a745;
	}

	.entry.warning {
		border-left-color: #e0a800;
	}

	.entry.ransacked {
		border-left-color: #dc3545;
	}

	.raid-entry.locked {
		border-left-color: #4a9eff;
	}

	.entry-main {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		flex-wrap: wrap;
		font-size: 0.8rem;
	}

	.character {
		color: white;
		font-weight: 600;
		min-width: 110px;
	}

	.pips-cell {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.opens-text {
		color: #b0b0b0;
		font-variant-numeric: tabular-nums;
	}

	.status-cell {
		white-space: nowrap;
	}

	.status-cell.clear {
		color: #666;
	}

	.status-cell.active {
		color: #4ec26b;
	}

	.status-cell.warning {
		color: #e0a800;
	}

	.status-cell.ransacked {
		color: #e4606d;
		font-weight: 600;
	}

	.status-cell.raid-locked {
		color: #4a9eff;
	}

	.status-cell.raid-ready {
		color: #777;
	}

	.entry-actions {
		margin-left: auto;
		display: flex;
		gap: 0.35rem;
		align-items: center;
	}

	.loot-btn {
		background: #d4af37;
		color: #1a1a1a;
		border: 1px solid #d4af37;
		border-radius: 3px;
		padding: 0.2rem 0.55rem;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
		white-space: nowrap;
		transition: background-color 0.2s ease;
	}

	.loot-btn:hover:not(:disabled) {
		background: #e6c547;
	}

	.loot-btn:disabled {
		background: #3a3a3a;
		border-color: #555;
		color: #777;
		cursor: not-allowed;
	}

	/* − and + share one look: gold when the action is available, grey when it is not. */
	.count-btn {
		background: #d4af37;
		color: #1a1a1a;
		border: 1px solid #d4af37;
		border-radius: 3px;
		width: 26px;
		height: 24px;
		font-size: 1rem;
		font-weight: 700;
		line-height: 1;
		cursor: pointer;
		transition:
			background-color 0.2s ease,
			border-color 0.2s ease;
	}

	.count-btn:hover:not(:disabled) {
		background: #e6c547;
		border-color: #e6c547;
	}

	.count-btn:disabled {
		background: #3a3a3a;
		border-color: #555;
		color: #777;
		cursor: not-allowed;
	}

	.icon-btn {
		background: #3a3a3a;
		border: 1px solid #555;
		border-radius: 3px;
		color: #e0e0e0;
		width: 24px;
		height: 24px;
		font-size: 0.85rem;
		line-height: 1;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.icon-btn:hover:not(:disabled) {
		border-color: #d4af37;
		color: #d4af37;
	}

	.icon-btn:disabled {
		color: #555;
		cursor: not-allowed;
	}

	.ghost {
		background: none;
		border: 1px solid #555;
		border-radius: 3px;
		color: #b0b0b0;
		padding: 0.2rem 0.5rem;
		font-size: 0.78rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.ghost:hover {
		border-color: #4a9eff;
		color: #4a9eff;
	}

	.danger {
		background: #dc3545;
		border: 1px solid #dc3545;
		border-radius: 3px;
		color: white;
		padding: 0.15rem 0.45rem;
		font-size: 0.75rem;
		cursor: pointer;
	}

	.danger:hover {
		background: #c82333;
	}

	.editor {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-top: 0.4rem;
		padding-top: 0.45rem;
		border-top: 1px solid #22262c;
	}

	.editor label {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		font-size: 0.74rem;
		color: #b0b0b0;
		align-items: flex-start;
	}

	.editor input {
		background: #252832;
		border: 1px solid #555;
		border-radius: 3px;
		color: #e0e0e0;
		padding: 0.3rem 0.45rem;
		font-size: 0.82rem;
		color-scheme: dark;
	}

	.editor input:focus {
		outline: none;
		border-color: #d4af37;
	}

	.editor-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.nudge-group,
	.save-group {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
		align-items: center;
	}

	.nudge-group {
		padding-right: 0.75rem;
		border-right: 1px solid #2f333a;
	}

	.editor-actions .primary {
		background: #d4af37;
		border: 1px solid #d4af37;
		border-radius: 3px;
		color: #1a1a1a;
		padding: 0.25rem 0.6rem;
		font-size: 0.78rem;
		font-weight: 600;
		cursor: pointer;
	}

	.danger-outline {
		background: none;
		border: 1px solid #dc3545;
		border-radius: 3px;
		color: #e4606d;
		padding: 0.25rem 0.6rem;
		font-size: 0.78rem;
		cursor: pointer;
	}

	.hint {
		margin: 0;
		font-size: 0.7rem;
		color: #666;
	}

	.no-characters {
		margin: 0;
		font-size: 0.8rem;
		color: #888;
	}

	.detach-btn {
		background: none;
		border: none;
		color: #666;
		font-size: 1rem;
		line-height: 1;
		padding: 0 0.15rem;
		cursor: pointer;
		transition: color 0.2s ease;
	}

	.detach-btn:hover {
		color: #e4606d;
	}

	.detach-confirm {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		flex-wrap: wrap;
		margin-top: 0.35rem;
		padding-top: 0.35rem;
		border-top: 1px solid #22262c;
		font-size: 0.76rem;
		color: #e4606d;
	}

	.add-characters {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
		margin-top: 0.5rem;
		padding-top: 0.45rem;
		border-top: 1px solid #2a2a2a;
	}

	.add-label {
		font-size: 0.72rem;
		color: #777;
	}

	.add-character-btn {
		background: none;
		border: 1px dashed #555;
		border-radius: 3px;
		color: #b0b0b0;
		padding: 0.15rem 0.5rem;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.add-character-btn:hover {
		border-style: solid;
		border-color: #d4af37;
		color: #d4af37;
	}

	@media (max-width: 720px) {
		.meta {
			margin-left: 0;
			width: 100%;
		}

		.character {
			min-width: 0;
			width: 100%;
		}

		.entry-actions {
			margin-left: 0;
		}

		.status-cell {
			white-space: normal;
		}
	}
</style>
