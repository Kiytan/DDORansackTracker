<script lang="ts">
	import QuestCard from './QuestCard.svelte';
	import { filters, questRows, resetFilters, trackedQuests } from './ransackStore';

	const PAGE_SIZE = 30;

	let visibleCount = PAGE_SIZE;

	// Any filter change puts us back at the top of the list.
	$: if ($filters) visibleCount = PAGE_SIZE;

	$: visibleRows = $questRows.slice(0, visibleCount);
	$: hiddenCount = $questRows.length - visibleRows.length;
</script>

<section class="list-panel">
	<div class="list-header">
		<h2>
			Your quests
			<span class="count">{$questRows.length}</span>
		</h2>
	</div>

	{#if $trackedQuests.length === 0}
		<p class="empty">
			Your list is empty. Search for a quest above and add it, then press
			<strong>+</strong> for each character the first time you loot its chests — that starts the 168-hour
			window. You can also click the edit button to adjust the start time if you looted it a while ago
		</p>
	{:else if $questRows.length === 0}
		<p class="empty">
			No quests in your list match the current filters.
			<button class="link" on:click={resetFilters}>Clear filters</button>
		</p>
	{:else}
		<div class="rows">
			{#each visibleRows as row (row.quest.id)}
				<QuestCard {row} />
			{/each}
		</div>

		{#if hiddenCount > 0}
			<button class="more-btn" on:click={() => (visibleCount += PAGE_SIZE)}>
				Show {Math.min(hiddenCount, PAGE_SIZE)} more ({hiddenCount} hidden)
			</button>
		{/if}
	{/if}
</section>

<style>
	.list-panel {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.list-header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	h2 {
		font-size: 1.1rem;
		color: #d4af37;
		margin: 0;
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}

	.count {
		font-size: 0.8rem;
		color: #888;
		background: #1c2126;
		border: 1px solid #404040;
		border-radius: 10px;
		padding: 0.05rem 0.45rem;
	}

	.rows {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.empty {
		background: #1c2126;
		border: 1px solid #404040;
		border-radius: 8px;
		padding: 1.25rem;
		color: #b0b0b0;
		line-height: 1.6;
		margin: 0;
	}

	.empty strong {
		color: #d4af37;
		font-weight: 600;
	}

	.link {
		background: none;
		border: none;
		color: #d4af37;
		padding: 0;
		font-size: inherit;
		cursor: pointer;
		text-decoration: underline;
	}

	.more-btn {
		background: #1c2126;
		border: 1px solid #404040;
		border-radius: 4px;
		color: #d4af37;
		padding: 0.6rem;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.more-btn:hover {
		border-color: #d4af37;
		background: rgba(212, 175, 55, 0.08);
	}
</style>
