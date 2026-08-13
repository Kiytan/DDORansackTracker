<script lang="ts">
	import {
		addCharacter,
		characterSummaries,
		clearCharacterTimers,
		deleteCharacter,
		removeCharacterFromAllQuests,
		renameCharacter,
		setIncludeByDefault
	} from './ransackStore';
	import Countdown from './Countdown.svelte';

	/** The destructive actions in the edit form all confirm before running. */
	type DangerAction = 'timers' | 'quests' | 'delete';

	let newName = '';
	let editingId: string | null = null;
	let editName = '';
	let confirming: DangerAction | null = null;

	function submitNew() {
		if (!addCharacter(newName)) return;
		newName = '';
	}

	function startEdit(id: string, name: string) {
		editingId = id;
		editName = name;
		confirming = null;
	}

	function submitEdit() {
		if (!editingId) return;
		renameCharacter(editingId, editName);
		editingId = null;
	}

	function run(action: DangerAction, characterId: string) {
		if (action === 'timers') clearCharacterTimers(characterId);
		if (action === 'quests') removeCharacterFromAllQuests(characterId);
		if (action === 'delete') {
			deleteCharacter(characterId);
			editingId = null;
		}
		confirming = null;
	}
</script>

<section class="panel">
	<h2>Characters</h2>

	<form class="add-form" on:submit|preventDefault={submitNew}>
		<input
			type="text"
			placeholder="Character name"
			bind:value={newName}
			maxlength="40"
			aria-label="New character name"
		/>
		<button type="submit" class="primary" disabled={!newName.trim()}>Add</button>
	</form>

	{#if $characterSummaries.length > 0}
		<p class="tick-hint">
			Tick a character to attach it to quests you add from now on. You can always add or remove one
			on an individual quest.
		</p>
	{/if}

	{#if $characterSummaries.length === 0}
		<p class="empty">
			Add every character you want to track. Each quest in your list gets a row per character.
		</p>
	{:else}
		<ul class="character-list">
			{#each $characterSummaries as summary (summary.character.id)}
				{@const character = summary.character}
				<li>
					{#if editingId === character.id}
						<form class="edit-form" on:submit|preventDefault={submitEdit}>
							<input type="text" bind:value={editName} maxlength="40" aria-label="Character name" />
							<div class="edit-actions">
								<button type="submit" class="primary">Save</button>
								<button type="button" on:click={() => (editingId = null)}>Cancel</button>
							</div>
							<div class="danger-actions">
								{#if confirming}
									{@const action = confirming}
									<p class="confirm-note">
										{#if action === 'timers'}
											Reset every timer for {character.name}? They stay on the same quests.
										{:else if action === 'quests'}
											Take {character.name} off every quest? Their timers go with them.
										{:else}
											Delete {character.name} and everything tracked for them?
										{/if}
									</p>
									<div class="confirm-actions">
										<button type="button" class="danger" on:click={() => run(action, character.id)}>
											Yes, {action === 'timers'
												? 'clear timers'
												: action === 'quests'
													? 'remove from all'
													: 'delete'}
										</button>
										<button type="button" on:click={() => (confirming = null)}>Cancel</button>
									</div>
								{:else}
									<button
										type="button"
										class="link-danger"
										on:click={() => (confirming = 'timers')}
									>
										Clear all timers
									</button>
									<button
										type="button"
										class="link-danger"
										on:click={() => (confirming = 'quests')}
									>
										Remove from all quests
									</button>
									<button
										type="button"
										class="link-danger"
										on:click={() => (confirming = 'delete')}
									>
										Delete character
									</button>
								{/if}
							</div>
						</form>
					{:else}
						<div class="character-row">
							<label
								class="default-tick"
								title="Attach {character.name} to quests you add from now on"
							>
								<input
									type="checkbox"
									checked={character.includeByDefault}
									on:change={(event) =>
										setIncludeByDefault(
											character.id,
											(event.currentTarget as HTMLInputElement).checked
										)}
								/>
								<span class="visually-hidden">
									Add {character.name} to new quests by default
								</span>
							</label>
							<div class="character-info">
								<span class="name">{character.name}</span>
								<span class="counts">
									{#if summary.tracked > 0}
										<span class="count tracked" title="Quests with a running ransack window">
											{summary.tracked} running
										</span>
									{/if}
									{#if summary.ransacked > 0}
										<span class="count ransacked" title="Quests that are fully ransacked">
											{summary.ransacked} ransacked
										</span>
									{/if}
									{#if summary.raidsLocked > 0}
										<span class="count raid" title="Raids on lockout">
											{summary.raidsLocked} raid{summary.raidsLocked === 1 ? '' : 's'}
										</span>
									{/if}
									{#if summary.tracked === 0 && summary.raidsLocked === 0}
										<span class="count none">Nothing running</span>
									{/if}
								</span>
								{#if summary.nextReset > 0}
									<span class="next">next in <Countdown ms={summary.nextReset} /></span>
								{/if}
							</div>
							<button
								class="edit-btn"
								title="Edit {character.name}"
								aria-label="Edit {character.name}"
								on:click={() => startEdit(character.id, character.name)}
							>
								✎
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.panel {
		background: #1c2126;
		border: 1px solid #404040;
		border-radius: 8px;
		padding: 1rem;
	}

	h2 {
		font-size: 1.1rem;
		color: #d4af37;
		margin: 0 0 0.75rem;
	}

	.add-form {
		display: flex;
		gap: 0.4rem;
		margin-bottom: 0.75rem;
	}

	.add-form input {
		flex: 1;
		min-width: 0;
	}

	input[type='text'] {
		background: #1a1a1a;
		border: 1px solid #555;
		border-radius: 4px;
		color: #e0e0e0;
		padding: 0.45rem 0.6rem;
		font-size: 0.9rem;
		width: 100%;
		box-sizing: border-box;
	}

	input[type='text']:focus {
		outline: none;
		border-color: #d4af37;
		box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
	}

	button.primary {
		background: #d4af37;
		color: #1a1a1a;
		border: 1px solid #d4af37;
		border-radius: 4px;
		padding: 0.45rem 0.75rem;
		font-weight: 600;
		cursor: pointer;
		transition: background-color 0.2s ease;
		white-space: nowrap;
	}

	button.primary:hover:not(:disabled) {
		background: #e6c547;
	}

	button.primary:disabled {
		background: #3a3a3a;
		border-color: #555;
		color: #777;
		cursor: not-allowed;
	}

	.edit-form {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.edit-actions {
		display: flex;
		gap: 0.5rem;
	}

	.edit-actions button {
		flex: 1;
		background: #3a3a3a;
		color: #e0e0e0;
		border: 1px solid #555;
		border-radius: 4px;
		padding: 0.4rem;
		cursor: pointer;
	}

	.edit-actions button.primary {
		background: #d4af37;
		color: #1a1a1a;
		border-color: #d4af37;
	}

	.danger-actions {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		border-top: 1px solid #404040;
		padding-top: 0.5rem;
	}

	.link-danger {
		background: none;
		border: none;
		color: #dc3545;
		font-size: 0.8rem;
		text-align: left;
		padding: 0;
		cursor: pointer;
	}

	.link-danger:hover {
		color: #e4606d;
		text-decoration: underline;
	}

	button.danger {
		background: #dc3545;
		color: white;
		border: none;
		border-radius: 4px;
		padding: 0.4rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.confirm-note {
		margin: 0;
		font-size: 0.76rem;
		color: #e4606d;
		line-height: 1.45;
	}

	.confirm-actions {
		display: flex;
		gap: 0.4rem;
	}

	.confirm-actions button {
		flex: 1;
		background: #3a3a3a;
		color: #e0e0e0;
		border: 1px solid #555;
		border-radius: 4px;
		padding: 0.4rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.confirm-actions button.danger {
		background: #dc3545;
		border-color: #dc3545;
		color: white;
	}

	button.danger:hover {
		background: #c82333;
	}

	.character-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.character-row {
		display: flex;
		align-items: stretch;
		border: 1px solid #404040;
		border-radius: 4px;
		overflow: hidden;
	}

	.default-tick {
		display: flex;
		align-items: center;
		padding: 0 0.1rem 0 0.55rem;
		cursor: pointer;
	}

	.default-tick input {
		accent-color: #d4af37;
		width: 15px;
		height: 15px;
		cursor: pointer;
		margin: 0;
	}

	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	.tick-hint {
		margin: 0 0 0.6rem;
		font-size: 0.72rem;
		color: #888;
		line-height: 1.5;
	}

	.character-info {
		flex: 1;
		padding: 0.5rem 0.6rem;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
	}

	.name {
		font-weight: 600;
		color: white;
	}

	.counts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		font-size: 0.72rem;
	}

	.count {
		border-radius: 3px;
		padding: 0.05rem 0.3rem;
	}

	.count.tracked {
		background: rgba(40, 167, 69, 0.15);
		color: #4ec26b;
	}

	.count.ransacked {
		background: rgba(220, 53, 69, 0.15);
		color: #e4606d;
	}

	.count.raid {
		background: rgba(74, 158, 255, 0.15);
		color: #4a9eff;
	}

	.count.none {
		color: #666;
	}

	.next {
		font-size: 0.72rem;
		color: #b0b0b0;
	}

	.edit-btn {
		background: none;
		border: none;
		border-left: 1px solid #404040;
		color: #888;
		padding: 0 0.6rem;
		cursor: pointer;
		font-size: 0.9rem;
	}

	.edit-btn:hover {
		color: #d4af37;
		background: rgba(212, 175, 55, 0.1);
	}

	.empty {
		color: #888;
		font-size: 0.85rem;
		margin: 0;
		line-height: 1.5;
	}
</style>
