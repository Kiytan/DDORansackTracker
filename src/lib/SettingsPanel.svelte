<script lang="ts">
	import {
		characters,
		exportShareUrl,
		exportToJson,
		importFromJson,
		resetAll,
		resetQuests,
		trackedQuests
	} from './ransackStore';

	let shareUrl = '';
	let copyState: 'idle' | 'copied' | 'failed' = 'idle';
	let importMode: 'merge' | 'replace' = 'merge';
	let importMessage: string | null = null;
	let importError = false;
	let confirming: 'quests' | 'all' | null = null;
	let fileInput: HTMLInputElement;

	function generateShareUrl() {
		shareUrl = exportShareUrl();
		copyState = 'idle';
	}

	async function copyShareUrl() {
		if (!shareUrl) generateShareUrl();
		try {
			await navigator.clipboard.writeText(shareUrl);
			copyState = 'copied';
		} catch {
			copyState = 'failed';
		}
	}

	function downloadBackup() {
		const blob = new Blob([exportToJson()], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const anchor = document.createElement('a');
		const stamp = new Date().toISOString().slice(0, 10);
		anchor.href = url;
		anchor.download = `ddo-ransack-${stamp}.json`;
		anchor.click();
		URL.revokeObjectURL(url);
	}

	async function handleFile(event: Event) {
		const file = (event.target as HTMLInputElement).files?.[0];
		if (!file) return;

		const text = await file.text();
		const error = importFromJson(text, importMode === 'merge');

		importError = error !== null;
		importMessage = error ?? `Imported ${importMode === 'merge' ? 'and merged' : 'and replaced'}.`;
		fileInput.value = '';
	}

	function doResetQuests() {
		resetQuests();
		confirming = null;
		shareUrl = '';
		importMessage = null;
	}

	function doResetAll() {
		resetAll();
		confirming = null;
		shareUrl = '';
		importMessage = null;
	}
</script>

<section class="panel">
	<h2>Backup &amp; share</h2>

	<div class="block">
		<div class="buttons">
			<button on:click={copyShareUrl} disabled={$characters.length === 0}>
				{copyState === 'copied' ? 'Copied!' : 'Copy share link'}
			</button>
			<button on:click={downloadBackup} disabled={$characters.length === 0}>Download backup</button>
		</div>
		{#if copyState === 'failed'}
			<p class="note error">Copying failed — select the link below and copy it manually.</p>
			<textarea readonly rows="3" value={shareUrl}></textarea>
		{/if}
		<p class="note">
			The share link carries all of your characters and timers in the URL itself. Anyone who opens
			it is asked whether to merge or replace their own data.
		</p>
	</div>

	<div class="block">
		<h3>Restore a backup</h3>
		<div class="radio-row">
			<label><input type="radio" bind:group={importMode} value="merge" /> Merge</label>
			<label><input type="radio" bind:group={importMode} value="replace" /> Replace</label>
		</div>
		<input
			type="file"
			accept="application/json,.json"
			bind:this={fileInput}
			on:change={handleFile}
			aria-label="Choose a backup file"
		/>
		{#if importMessage}
			<p class="note" class:error={importError}>{importMessage}</p>
		{/if}
	</div>

	<div class="block danger-block">
		<div class="danger-item">
			{#if confirming === 'quests'}
				<p class="note error">
					This removes all {$trackedQuests.length} quest{$trackedQuests.length === 1 ? '' : 's'} from
					your list, along with every character's timers for them. Your characters stay.
				</p>
				<div class="buttons">
					<button class="danger" on:click={doResetQuests}>Yes, remove all quests</button>
					<button on:click={() => (confirming = null)}>Cancel</button>
				</div>
			{:else}
				<button
					class="link-danger"
					disabled={$trackedQuests.length === 0}
					on:click={() => (confirming = 'quests')}
				>
					Reset all quests
				</button>
				<p class="note">Clears your quest list and its timers. Characters are kept.</p>
			{/if}
		</div>

		<div class="danger-item">
			{#if confirming === 'all'}
				<p class="note error">
					This deletes every character, quest and timer in this browser. It cannot be undone.
				</p>
				<div class="buttons">
					<button class="danger" on:click={doResetAll}>Yes, delete everything</button>
					<button on:click={() => (confirming = null)}>Cancel</button>
				</div>
			{:else}
				<button class="link-danger" on:click={() => (confirming = 'all')}>Reset all data</button>
				<p class="note warning">
					Wipes characters, quests and timers. There is no undo — download a backup first.
				</p>
			{/if}
		</div>
	</div>

	<p class="storage-note">
		Everything lives in this browser's local storage. There is no account and no server — clearing
		site data will remove your timers, so keep a backup.
	</p>
</section>

<style>
	.panel {
		background: #1c2126;
		border: 1px solid #404040;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.85rem;
	}

	h2 {
		font-size: 1.1rem;
		color: #d4af37;
		margin: 0;
	}

	h3 {
		font-size: 0.85rem;
		color: #e0e0e0;
		margin: 0 0 0.4rem;
	}

	.block {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.buttons {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	button {
		background: #3a3a3a;
		border: 1px solid #555;
		border-radius: 4px;
		color: #e0e0e0;
		padding: 0.4rem 0.6rem;
		font-size: 0.82rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	button:hover:not(:disabled) {
		border-color: #d4af37;
		color: #d4af37;
	}

	button:disabled {
		color: #666;
		border-color: #3a3a3a;
		cursor: not-allowed;
	}

	button.danger {
		background: #dc3545;
		border-color: #dc3545;
		color: white;
	}

	button.danger:hover {
		background: #c82333;
		border-color: #c82333;
		color: white;
	}

	.link-danger {
		background: none;
		border: none;
		color: #dc3545;
		padding: 0;
		font-size: 0.82rem;
		text-align: left;
		cursor: pointer;
	}

	.link-danger:hover:not(:disabled) {
		color: #e4606d;
		text-decoration: underline;
	}

	.link-danger:disabled {
		color: #666;
		cursor: not-allowed;
	}

	.radio-row {
		display: flex;
		gap: 0.85rem;
		font-size: 0.82rem;
		color: #b0b0b0;
	}

	.radio-row label {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		cursor: pointer;
	}

	input[type='file'] {
		font-size: 0.78rem;
		color: #b0b0b0;
	}

	input[type='file']::file-selector-button {
		background: #3a3a3a;
		border: 1px solid #555;
		border-radius: 4px;
		color: #e0e0e0;
		padding: 0.3rem 0.5rem;
		margin-right: 0.5rem;
		cursor: pointer;
	}

	textarea {
		background: #1a1a1a;
		border: 1px solid #555;
		border-radius: 4px;
		color: #e0e0e0;
		font-size: 0.72rem;
		padding: 0.4rem;
		width: 100%;
		box-sizing: border-box;
		resize: vertical;
	}

	.note {
		margin: 0;
		font-size: 0.72rem;
		color: #888;
		line-height: 1.5;
	}

	.note.error {
		color: #e4606d;
	}

	.note.warning {
		color: #c98a90;
	}

	.danger-block {
		border-top: 1px solid #404040;
		padding-top: 0.75rem;
		gap: 0.85rem;
	}

	.danger-item {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		align-items: flex-start;
	}

	.storage-note {
		margin: 0;
		font-size: 0.7rem;
		color: #666;
		line-height: 1.5;
		border-top: 1px solid #404040;
		padding-top: 0.75rem;
	}
</style>
