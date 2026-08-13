<script lang="ts">
	import { adventurePacks, filters, patrons, resetFilters, updateFilters } from './ransackStore';
	import type { SortBy } from './types';

	let showFilters = false;

	const sortOptions: { value: SortBy; label: string }[] = [
		{ value: 'added', label: 'Recently added' },
		{ value: 'remaining', label: 'Time remaining' },
		{ value: 'name', label: 'Quest name' },
		{ value: 'level', label: 'Quest level' },
		{ value: 'opens', label: 'Times looted' },
		{ value: 'patron', label: 'Patron' },
		{ value: 'adventurePack', label: 'Adventure pack' }
	];

	function setLevel(field: 'minLevel' | 'maxLevel', event: Event) {
		const raw = (event.target as HTMLInputElement).value;
		updateFilters({ [field]: raw === '' ? undefined : Number(raw) });
	}

	$: hasFilters =
		$filters.search !== '' ||
		$filters.minLevel !== undefined ||
		$filters.maxLevel !== undefined ||
		$filters.patron !== '' ||
		$filters.adventurePack !== '' ||
		$filters.raids !== 'all' ||
		$filters.hideRansacked;
</script>

<section class="panel">
	<div class="bar">
		<div class="sort">
			<label for="sort-by">Sort by</label>
			<select
				id="sort-by"
				value={$filters.sortBy}
				on:change={(event) =>
					updateFilters({ sortBy: (event.target as HTMLSelectElement).value as SortBy })}
			>
				{#each sortOptions as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
			<button
				class="order-btn"
				on:click={() => updateFilters({ sortOrder: $filters.sortOrder === 'asc' ? 'desc' : 'asc' })}
				title={$filters.sortOrder === 'asc' ? 'Ascending' : 'Descending'}
				aria-label="Toggle sort direction"
			>
				{$filters.sortOrder === 'asc' ? '↑' : '↓'}
			</button>
		</div>

		<button class="filters-btn" class:on={hasFilters} on:click={() => (showFilters = !showFilters)}>
			Filters {hasFilters ? '•' : ''}
		</button>
	</div>

	{#if showFilters}
		<div class="filter-grid">
			<label class="field">
				<span>Filter your list</span>
				<input
					type="search"
					placeholder="Quest, patron or pack…"
					value={$filters.search}
					on:input={(event) => updateFilters({ search: (event.target as HTMLInputElement).value })}
				/>
			</label>

			<label class="field">
				<span>Raids</span>
				<select
					value={$filters.raids}
					on:change={(event) =>
						updateFilters({
							raids: (event.target as HTMLSelectElement).value as 'all' | 'only' | 'exclude'
						})}
				>
					<option value="all">Include raids</option>
					<option value="only">Raids only</option>
					<option value="exclude">Hide raids</option>
				</select>
			</label>

			<label class="field">
				<span>Patron</span>
				<select
					value={$filters.patron}
					on:change={(event) =>
						updateFilters({ patron: (event.target as HTMLSelectElement).value })}
				>
					<option value="">Any patron</option>
					{#each $patrons as patron (patron)}
						<option value={patron}>{patron}</option>
					{/each}
				</select>
			</label>

			<label class="field">
				<span>Adventure pack</span>
				<select
					value={$filters.adventurePack}
					on:change={(event) =>
						updateFilters({ adventurePack: (event.target as HTMLSelectElement).value })}
				>
					<option value="">Any pack</option>
					{#each $adventurePacks as pack (pack)}
						<option value={pack}>{pack}</option>
					{/each}
				</select>
			</label>

			<label class="field checkbox-field">
				<span>Ransacked</span>
				<span class="checkbox-row">
					<input
						type="checkbox"
						checked={$filters.hideRansacked}
						on:change={(event) =>
							updateFilters({ hideRansacked: (event.currentTarget as HTMLInputElement).checked })}
					/>
					Hide fully ransacked
				</span>
			</label>

			<div class="field">
				<span>Level</span>
				<div class="level-inputs">
					<input
						type="number"
						min="1"
						max="34"
						placeholder="min"
						value={$filters.minLevel ?? ''}
						on:input={(event) => setLevel('minLevel', event)}
						aria-label="Minimum level"
					/>
					<span class="dash">–</span>
					<input
						type="number"
						min="1"
						max="34"
						placeholder="max"
						value={$filters.maxLevel ?? ''}
						on:input={(event) => setLevel('maxLevel', event)}
						aria-label="Maximum level"
					/>
				</div>
			</div>

			<button class="clear-btn" on:click={resetFilters}>Clear filters</button>
		</div>
	{/if}
</section>

<style>
	.panel {
		background: #1c2126;
		border: 1px solid #404040;
		border-radius: 8px;
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.bar {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		justify-content: space-between;
	}

	.sort {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.sort label {
		font-size: 0.85rem;
		color: #b0b0b0;
	}

	input,
	select {
		background: #1a1a1a;
		border: 1px solid #555;
		border-radius: 4px;
		color: #e0e0e0;
		padding: 0.4rem 0.55rem;
		font-size: 0.88rem;
	}

	input:focus,
	select:focus {
		outline: none;
		border-color: #d4af37;
		box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.2);
	}

	.order-btn,
	.filters-btn,
	.clear-btn {
		background: #3a3a3a;
		border: 1px solid #555;
		border-radius: 4px;
		color: #e0e0e0;
		padding: 0.4rem 0.6rem;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.order-btn:hover,
	.filters-btn:hover,
	.clear-btn:hover {
		border-color: #d4af37;
		color: #d4af37;
	}

	.filters-btn.on {
		border-color: #d4af37;
		color: #d4af37;
	}

	.filter-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.75rem;
		border-top: 1px solid #404040;
		padding-top: 0.75rem;
		align-items: end;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: #b0b0b0;
		min-width: 0;
	}

	.field input,
	.field select {
		width: 100%;
		box-sizing: border-box;
	}

	.checkbox-row {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.85rem;
		color: #e0e0e0;
		cursor: pointer;
		/* Line up with the height of the selects on the same row. */
		min-height: 2rem;
	}

	.checkbox-row input {
		accent-color: #d4af37;
		width: 15px;
		height: 15px;
		margin: 0;
		cursor: pointer;
	}

	.checkbox-field {
		cursor: pointer;
	}

	.level-inputs {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}

	.level-inputs input {
		min-width: 0;
	}

	.dash {
		color: #666;
	}

	.clear-btn {
		align-self: end;
	}
</style>
