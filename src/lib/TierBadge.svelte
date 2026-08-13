<script lang="ts">
	import { getQuestTier } from './types';

	export let level: number;
	export let size: 'small' | 'medium' = 'medium';

	$: tier = getQuestTier(level);
</script>

<span class="tier {tier.toLowerCase()} {size}" title="{tier} · level {level}">{tier}</span>

<style>
	.tier {
		flex-shrink: 0;
		font-size: 0.68rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		border-radius: 3px;
		padding: 0.05rem 0.35rem;
		border: 1px solid transparent;
	}

	.tier.small {
		font-size: 0.62rem;
		padding: 0.05rem 0.3rem;
	}

	.heroic {
		background: rgba(74, 158, 255, 0.12);
		color: #6cb0ff;
		border-color: rgba(74, 158, 255, 0.35);
	}

	.epic {
		background: rgba(168, 85, 247, 0.15);
		color: #c084fc;
		border-color: rgba(168, 85, 247, 0.4);
	}

	.legendary {
		background: rgba(234, 88, 12, 0.15);
		color: #fb923c;
		border-color: rgba(234, 88, 12, 0.4);
	}
</style>
