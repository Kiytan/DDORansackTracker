<script lang="ts">
	import { formatDateTime, formatDuration, formatDurationLong } from './time';

	export let ms: number;
	export let at: number = 0;
	export let label: string = 'Resets';

	$: display = formatDuration(ms);
	$: tooltip = at ? `${label} ${formatDateTime(at)} — in ${formatDurationLong(ms)}` : '';
</script>

<span class="countdown" title={tooltip}>{display}</span>

<style>
	.countdown {
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
