<script lang="ts">
	import { base } from '$app/paths';

	let open = false;
	let loading = false;
	let html = '';

	async function show() {
		open = true;
		if (html) return;

		loading = true;
		try {
			const response = await fetch(`${base}/PATCHNOTES.md`, { cache: 'no-cache' });
			if (!response.ok) throw new Error(`HTTP ${response.status}`);
			html = render(await response.text());
		} catch (error) {
			console.error('Failed to load patch notes:', error);
			html = '<p>Could not load the patch notes. Try again later.</p>';
		} finally {
			loading = false;
		}
	}

	function close() {
		open = false;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && open) close();
	}

	function escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;');
	}

	/** Inline formatting: bold, code, and [text](https://…) links. */
	function inline(text: string): string {
		return escapeHtml(text)
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(
				/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
				'<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>'
			);
	}

	/**
	 * Just enough markdown for the patch notes file: headings, rules and lists.
	 *
	 * Everything is HTML-escaped before formatting is applied, so the file cannot
	 * inject markup even though the result is rendered with {@html}.
	 */
	function render(markdown: string): string {
		let out = '';
		let inList = false;

		for (const raw of markdown.split('\n')) {
			const line = raw.trim();

			if (!line) continue;

			if (!line.startsWith('- ') && inList) {
				out += '</ul>';
				inList = false;
			}

			if (line.startsWith('### ')) out += `<h4>${inline(line.slice(4))}</h4>`;
			else if (line.startsWith('## ')) out += `<h3>${inline(line.slice(3))}</h3>`;
			else if (line.startsWith('# '))
				continue; // The dialog already has a title.
			else if (line === '---') out += '<hr>';
			else if (line.startsWith('- ')) {
				if (!inList) {
					out += '<ul>';
					inList = true;
				}
				out += `<li>${inline(line.slice(2))}</li>`;
			} else out += `<p>${inline(line)}</p>`;
		}

		if (inList) out += '</ul>';
		return out;
	}
</script>

<svelte:window on:keydown={handleKeydown} />

<button class="trigger" on:click={show}>Patch notes</button>

{#if open}
	<div class="backdrop" role="presentation" on:click={close}>
		<div
			class="dialog"
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="patch-notes-title"
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<div class="dialog-header">
				<h2 id="patch-notes-title">Patch notes</h2>
				<button class="close" on:click={close} aria-label="Close patch notes">×</button>
			</div>

			<div class="content">
				{#if loading}
					<p>Loading…</p>
				{:else}
					{@html html}
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	.trigger {
		background: none;
		border: none;
		color: #d4af37;
		font-size: inherit;
		padding: 0;
		cursor: pointer;
		text-decoration: underline;
	}

	.trigger:hover {
		color: #e6c547;
	}

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
		max-width: 640px;
		width: 100%;
		max-height: 80vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6);
	}

	.dialog-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid #404040;
	}

	h2 {
		margin: 0;
		font-size: 1.2rem;
		color: #d4af37;
	}

	.close {
		background: none;
		border: none;
		color: #888;
		font-size: 1.5rem;
		line-height: 1;
		cursor: pointer;
		padding: 0 0.25rem;
	}

	.close:hover {
		color: #e4606d;
	}

	.content {
		padding: 1rem 1.25rem 1.25rem;
		overflow-y: auto;
		color: #e0e0e0;
		font-size: 0.9rem;
		line-height: 1.6;
		text-align: left;
	}

	.content :global(h3) {
		color: #d4af37;
		font-size: 1rem;
		margin: 1.25rem 0 0.5rem;
	}

	.content :global(h3:first-child) {
		margin-top: 0;
	}

	.content :global(h4) {
		color: #ffffff;
		font-size: 0.88rem;
		margin: 0.85rem 0 0.35rem;
	}

	.content :global(ul) {
		margin: 0;
		padding-left: 1.15rem;
	}

	.content :global(li) {
		margin-bottom: 0.35rem;
	}

	.content :global(p) {
		margin: 0.5rem 0;
		color: #b0b0b0;
	}

	.content :global(strong) {
		color: #ffffff;
	}

	.content :global(a) {
		color: #4a9eff;
	}

	.content :global(hr) {
		border: none;
		border-top: 1px solid #404040;
		margin: 1.25rem 0;
	}

	.content :global(code) {
		background: #1a1a1a;
		border-radius: 3px;
		padding: 0.05rem 0.3rem;
		font-size: 0.85em;
	}
</style>
