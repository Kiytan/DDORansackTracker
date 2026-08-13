<script lang="ts">
	import Countdown from './Countdown.svelte';
	import { upcomingResets } from './ransackStore';
	import { formatShortDateTime } from './time';

	const LIMIT = 8;

	let expanded = false;

	$: visible = expanded ? $upcomingResets : $upcomingResets.slice(0, LIMIT);
	$: hiddenCount = $upcomingResets.length - visible.length;
</script>

<section class="panel">
	<h2>Coming back soon</h2>

	{#if $upcomingResets.length === 0}
		<p class="empty">Nothing on a timer across your characters.</p>
	{:else}
		<ul>
			{#each visible as item (item.character.id + item.quest.id + item.kind)}
				<li class={item.kind}>
					<div class="line">
						<span class="quest">{item.quest.name}</span>
						<span class="remaining">
							<Countdown
								ms={item.msRemaining}
								at={item.at}
								label={item.kind === 'raid' ? 'Available' : 'Resets'}
							/>
						</span>
					</div>
					<div class="sub">
						<span class="character">{item.character.name}</span>
						<span class="kind">{item.kind === 'raid' ? 'raid lockout' : 'chest ransack'}</span>
						<span class="at">{formatShortDateTime(item.at)}</span>
					</div>
				</li>
			{/each}
		</ul>

		{#if hiddenCount > 0}
			<button class="more" on:click={() => (expanded = true)}>Show {hiddenCount} more</button>
		{:else if expanded && $upcomingResets.length > LIMIT}
			<button class="more" on:click={() => (expanded = false)}>Show fewer</button>
		{/if}
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

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	li {
		background: #1a1a1a;
		border-left: 3px solid #28a745;
		border-radius: 3px;
		padding: 0.4rem 0.5rem;
	}

	li.raid {
		border-left-color: #4a9eff;
	}

	.line {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		align-items: baseline;
	}

	.quest {
		color: white;
		font-size: 0.85rem;
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.remaining {
		color: #d4af37;
		font-size: 0.85rem;
		flex-shrink: 0;
	}

	.sub {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		font-size: 0.7rem;
		color: #888;
	}

	.character {
		color: #b0b0b0;
	}

	.at {
		color: #666;
	}

	.more {
		margin-top: 0.5rem;
		width: 100%;
		background: none;
		border: 1px solid #404040;
		border-radius: 4px;
		color: #d4af37;
		padding: 0.4rem;
		font-size: 0.8rem;
		cursor: pointer;
	}

	.more:hover {
		border-color: #d4af37;
		background: rgba(212, 175, 55, 0.08);
	}

	.empty {
		color: #888;
		font-size: 0.85rem;
		margin: 0;
	}
</style>
