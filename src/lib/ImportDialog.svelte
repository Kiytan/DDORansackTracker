<script lang="ts">
	import { cancelHashImport, characters, importFromHash, pendingHashImport } from './ransackStore';

	$: incoming = $pendingHashImport;
	$: incomingTimers = incoming
		? Object.values(incoming.data).reduce(
				(sum, entry) => sum + Object.keys(entry.ransack).length + Object.keys(entry.raids).length,
				0
			)
		: 0;

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') cancelHashImport();
	}
</script>

<svelte:window on:keydown={handleKeydown} />

{#if incoming}
	<div class="backdrop" role="presentation" on:click={cancelHashImport}>
		<div
			class="dialog"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="import-title"
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<h2 id="import-title">Shared tracker data found</h2>

			<p>
				This link contains <strong>{incoming.characters.length}</strong>
				character{incoming.characters.length === 1 ? '' : 's'},
				<strong>{incoming.tracked.length}</strong>
				quest{incoming.tracked.length === 1 ? '' : 's'} and
				<strong>{incomingTimers}</strong> timer{incomingTimers === 1 ? '' : 's'}.
			</p>

			<ul class="characters">
				{#each incoming.characters as character (character.id)}
					<li>{character.name}</li>
				{/each}
			</ul>

			<div class="actions">
				<button class="primary" on:click={() => importFromHash(true)}> Merge with my data </button>
				<button
					class="danger"
					on:click={() => importFromHash(false)}
					title={$characters.length > 0 ? 'Discards everything currently stored' : ''}
				>
					Replace my data
				</button>
				<button on:click={cancelHashImport}>Cancel</button>
			</div>

			<p class="note">
				Merging matches characters by name, and keeps whichever copy of each timer was updated most
				recently.
			</p>
		</div>
	</div>
{/if}

<style>
	.backdrop {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.7);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		z-index: 2000;
	}

	.dialog {
		background: #1c2126;
		border: 1px solid #d4af37;
		border-radius: 8px;
		padding: 1.5rem;
		max-width: 460px;
		width: 100%;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
	}

	h2 {
		margin: 0 0 0.75rem;
		font-size: 1.25rem;
		color: #d4af37;
	}

	p {
		margin: 0 0 0.75rem;
		color: #e0e0e0;
		font-size: 0.9rem;
		line-height: 1.5;
	}

	strong {
		color: white;
	}

	.characters {
		list-style: none;
		margin: 0 0 1rem;
		padding: 0.5rem;
		background: #1a1a1a;
		border: 1px solid #404040;
		border-radius: 4px;
		max-height: 160px;
		overflow-y: auto;
		font-size: 0.85rem;
		color: #e0e0e0;
	}

	.characters li {
		padding: 0.15rem 0;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	button {
		background: #3a3a3a;
		border: 1px solid #555;
		border-radius: 4px;
		color: #e0e0e0;
		padding: 0.5rem 0.8rem;
		font-size: 0.85rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	button:hover {
		border-color: #d4af37;
		color: #d4af37;
	}

	button.primary {
		background: #d4af37;
		border-color: #d4af37;
		color: #1a1a1a;
		font-weight: 600;
	}

	button.primary:hover {
		background: #e6c547;
		color: #1a1a1a;
	}

	button.danger {
		border-color: #dc3545;
		color: #e4606d;
	}

	button.danger:hover {
		background: #dc3545;
		border-color: #dc3545;
		color: white;
	}

	.note {
		margin: 0.85rem 0 0;
		font-size: 0.75rem;
		color: #888;
	}
</style>
