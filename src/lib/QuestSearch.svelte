<script lang="ts">
	import { onDestroy } from 'svelte';
	import TierBadge from './TierBadge.svelte';
	import { quests, trackedQuests, trackQuest } from './ransackStore';
	import { getQuestTier, isRaid, type Quest } from './types';

	const MAX_RESULTS = 8;
	const DEBOUNCE_MS = 150;

	let term = '';
	let results: Quest[] = [];
	let showResults = false;
	let selectedIndex = -1;
	let justAdded = '';
	let searchInput: HTMLInputElement;
	let debounceTimer: ReturnType<typeof setTimeout>;
	let blurTimer: ReturnType<typeof setTimeout>;

	// Debounced, so typing quickly does not re-scan 850 quests on every keystroke.
	function generateResults(searchTerm: string) {
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const needle = searchTerm.trim().toLowerCase();
			if (!needle) {
				results = [];
				showResults = false;
				return;
			}

			results = $quests
				.filter((quest) => quest.name.toLowerCase().includes(needle))
				.sort((a, b) => {
					// Prefix matches first — typing "del" should surface Delera's Tomb.
					const aStarts = a.name.toLowerCase().startsWith(needle) ? 0 : 1;
					const bStarts = b.name.toLowerCase().startsWith(needle) ? 0 : 1;
					if (aStarts !== bStarts) return aStarts - bStarts;
					return a.name.localeCompare(b.name);
				})
				.slice(0, MAX_RESULTS);

			showResults = results.length > 0;
			selectedIndex = results.length > 0 ? 0 : -1;
		}, DEBOUNCE_MS);
	}

	$: generateResults(term);
	$: trackedSet = new Set($trackedQuests.map((entry) => entry.questId));

	function add(quest: Quest) {
		if (trackedSet.has(quest.id)) return;
		trackQuest(quest.id);
		justAdded = quest.name;
		term = '';
		results = [];
		showResults = false;
		selectedIndex = -1;
		searchInput?.focus();
	}

	function handleKeydown(event: KeyboardEvent) {
		if (!showResults) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				selectedIndex = Math.min(selectedIndex + 1, results.length - 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				selectedIndex = Math.max(selectedIndex - 1, 0);
				break;
			case 'Enter':
				event.preventDefault();
				if (selectedIndex >= 0) add(results[selectedIndex]);
				break;
			case 'Escape':
				showResults = false;
				selectedIndex = -1;
				break;
		}
	}

	function handleFocus() {
		if (results.length > 0) showResults = true;
	}

	function handleBlur() {
		// Delayed so a click on a result still registers before the list closes.
		blurTimer = setTimeout(() => {
			showResults = false;
			selectedIndex = -1;
		}, 150);
	}

	onDestroy(() => {
		clearTimeout(debounceTimer);
		clearTimeout(blurTimer);
	});
</script>

<section class="panel">
	<h2>Add a quest</h2>

	<div class="search-container">
		<input
			type="text"
			class="search-input"
			placeholder="Start typing a quest name…"
			bind:value={term}
			bind:this={searchInput}
			on:keydown={handleKeydown}
			on:focus={handleFocus}
			on:blur={handleBlur}
			autocomplete="off"
			role="combobox"
			aria-label="Search for a quest to add"
			aria-autocomplete="list"
			aria-expanded={showResults}
			aria-controls="quest-search-results"
		/>

		{#if showResults}
			<ul class="results" id="quest-search-results" role="listbox">
				{#each results as quest, index (quest.id)}
					{@const alreadyTracked = trackedSet.has(quest.id)}
					<li>
						<button
							type="button"
							class="result"
							class:selected={index === selectedIndex}
							class:disabled={alreadyTracked}
							role="option"
							aria-selected={index === selectedIndex}
							disabled={alreadyTracked}
							on:mouseenter={() => (selectedIndex = index)}
							on:click={() => add(quest)}
						>
							<span class="level {getQuestTier(quest.level).toLowerCase()}">{quest.level}</span>
							<span class="result-text">
								<span class="result-name">
									{quest.name}
									<TierBadge level={quest.level} size="small" />
									{#if isRaid(quest.name)}<span class="raid-badge">Raid</span>{/if}
								</span>
								<span class="result-meta">{quest.patron} · {quest.adventurePack}</span>
							</span>
							<span class="add-label">{alreadyTracked ? 'Added' : '+ Add'}</span>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</div>

	{#if justAdded && !term}
		<p class="added-note">Added <strong>{justAdded}</strong> to your list.</p>
	{:else}
		<p class="hint">
			Pick a quest to add it to your list below, then record a loot for each character as you run
			it.
		</p>
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
		margin: 0 0 0.6rem;
	}

	.search-container {
		position: relative;
		width: 100%;
	}

	.search-input {
		width: 100%;
		box-sizing: border-box;
		padding: 0.55rem 0.7rem;
		border: 1px solid #555;
		border-radius: 4px;
		background: #1a1a1a;
		color: #e0e0e0;
		font-size: 0.95rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #d4af37;
		box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
	}

	.search-input::placeholder {
		color: #888;
	}

	.results {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		list-style: none;
		margin: 0;
		padding: 0;
		background: #1a1a1a;
		border: 1px solid #555;
		border-top: none;
		border-radius: 0 0 4px 4px;
		max-height: 320px;
		overflow-y: auto;
		z-index: 1000;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
	}

	.result {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.5rem 0.7rem;
		background: none;
		border: none;
		color: #e0e0e0;
		text-align: left;
		cursor: pointer;
		font-size: 0.9rem;
		transition: background-color 0.15s ease;
	}

	.result.selected:not(.disabled) {
		background: rgba(212, 175, 55, 0.15);
	}

	.result.disabled {
		cursor: default;
		opacity: 0.55;
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

	.result-text {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		min-width: 0;
		flex: 1;
	}

	.result-name {
		color: white;
		font-weight: 600;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.raid-badge {
		font-size: 0.65rem;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		background: rgba(74, 158, 255, 0.15);
		color: #4a9eff;
		border-radius: 3px;
		padding: 0.05rem 0.3rem;
	}

	.result-meta {
		font-size: 0.72rem;
		color: #888;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.add-label {
		flex-shrink: 0;
		font-size: 0.78rem;
		font-weight: 600;
		color: #d4af37;
		border: 1px solid #d4af37;
		border-radius: 3px;
		padding: 0.15rem 0.5rem;
	}

	.result.disabled .add-label {
		color: #888;
		border-color: #555;
	}

	.result.selected:not(.disabled) .add-label {
		background: #d4af37;
		color: #1a1a1a;
	}

	.hint,
	.added-note {
		margin: 0.6rem 0 0;
		font-size: 0.75rem;
		color: #888;
		line-height: 1.5;
	}

	.added-note strong {
		color: #d4af37;
	}
</style>
