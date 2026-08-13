<script lang="ts">
	import { RANSACK_MAX_OPENS, type RansackStatus } from './types';

	export let opens: number;
	export let status: RansackStatus;
	export let size: 'small' | 'medium' = 'medium';
	/** Omit to render a read-only counter. */
	export let onSet: ((opens: number) => void) | undefined = undefined;
	export let label = '';

	$: pips = Array.from({ length: RANSACK_MAX_OPENS }, (_, index) => index < opens);
	$: remaining = RANSACK_MAX_OPENS - opens;

	// Clicking the pip that currently sits at the end steps back down, so a mis-click
	// is undone by clicking the same pip again.
	function handleClick(index: number) {
		if (!onSet) return;
		onSet(opens === index + 1 ? index : index + 1);
	}
</script>

{#if onSet}
	<span
		class="pips {size} {status}"
		role="group"
		aria-label="{label}{label ? ': ' : ''}times looted {opens} of {RANSACK_MAX_OPENS}"
	>
		{#each pips as filled, index (index)}
			<button
				type="button"
				class="pip interactive"
				class:filled
				title={index + 1 === opens
					? `Click to go back to ${index} loot${index === 1 ? '' : 's'}`
					: `Set to ${index + 1} loot${index === 0 ? '' : 's'}`}
				aria-label="Set to {index + 1} loots"
				aria-pressed={filled}
				on:click={() => handleClick(index)}
			></button>
		{/each}
	</span>
{:else}
	<span
		class="pips {size} {status}"
		title="Times looted: {opens} of {RANSACK_MAX_OPENS} — {remaining} before ransack"
		aria-label="Times looted {opens} of {RANSACK_MAX_OPENS}"
	>
		{#each pips as filled, index (index)}
			<span class="pip" class:filled></span>
		{/each}
	</span>
{/if}

<style>
	.pips {
		display: inline-flex;
		gap: 3px;
		align-items: center;
	}

	.pip {
		width: 12px;
		height: 14px;
		padding: 0;
		border-radius: 2px;
		border: 1px solid #555;
		background: #1a1a1a;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease,
			transform 0.1s ease;
	}

	.small .pip {
		width: 8px;
		height: 10px;
	}

	.pip.interactive {
		cursor: pointer;
	}

	.pip.interactive:hover {
		border-color: #d4af37;
		transform: translateY(-1px);
	}

	.pip.interactive:focus-visible {
		outline: 2px solid #d4af37;
		outline-offset: 1px;
	}

	.clear .pip.filled {
		background: #6c757d;
		border-color: #6c757d;
	}

	.active .pip.filled {
		background: #28a745;
		border-color: #28a745;
	}

	.warning .pip.filled {
		background: #e0a800;
		border-color: #e0a800;
	}

	.ransacked .pip.filled {
		background: #dc3545;
		border-color: #dc3545;
	}
</style>
