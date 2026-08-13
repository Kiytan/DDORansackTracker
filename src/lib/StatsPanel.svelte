<script lang="ts">
	import Countdown from './Countdown.svelte';
	import { overallStats } from './ransackStore';
	import { RANSACK_MAX_OPENS, RANSACK_WINDOW_HOURS } from './types';
</script>

<section class="panel">
	<h2>Overview</h2>

	<div class="grid">
		<div class="stat">
			<span class="value">{$overallStats.running}</span>
			<span class="label">timers running</span>
		</div>
		<div class="stat warning">
			<span class="value">{$overallStats.warning}</span>
			<span class="label">nearly ransacked</span>
		</div>
		<div class="stat ransacked">
			<span class="value">{$overallStats.ransacked}</span>
			<span class="label">ransacked</span>
		</div>
		<div class="stat raid">
			<span class="value">{$overallStats.raidsLocked}</span>
			<span class="label">raids locked</span>
		</div>
	</div>

	{#if $overallStats.nextReset > 0}
		<p class="next">
			Next timer back in <strong><Countdown ms={$overallStats.nextReset} /></strong>
		</p>
	{/if}

	<p class="rules">
		The first loot starts a {RANSACK_WINDOW_HOURS}-hour window. You get {RANSACK_MAX_OPENS} loots inside
		it; later loots never extend it.
	</p>
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

	.grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}

	.stat {
		background: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 4px;
		padding: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.value {
		font-size: 1.4rem;
		font-weight: 700;
		color: white;
		line-height: 1.1;
	}

	.label {
		font-size: 0.72rem;
		color: #888;
	}

	.stat.warning .value {
		color: #e0a800;
	}

	.stat.ransacked .value {
		color: #e4606d;
	}

	.stat.raid .value {
		color: #4a9eff;
	}

	.next {
		margin: 0.75rem 0 0;
		font-size: 0.85rem;
		color: #b0b0b0;
	}

	.next strong {
		color: #d4af37;
	}

	.rules {
		margin: 0.5rem 0 0;
		font-size: 0.72rem;
		color: #666;
		line-height: 1.5;
		border-top: 1px solid #404040;
		padding-top: 0.5rem;
	}
</style>
