<script lang="ts">
	import { onMount } from 'svelte';
	import CharacterPanel from '$lib/CharacterPanel.svelte';
	import ImportDialog from '$lib/ImportDialog.svelte';
	import ListControls from '$lib/ListControls.svelte';
	import QuestList from '$lib/QuestList.svelte';
	import QuestSearch from '$lib/QuestSearch.svelte';
	import SettingsPanel from '$lib/SettingsPanel.svelte';
	import StatsPanel from '$lib/StatsPanel.svelte';
	import UpcomingPanel from '$lib/UpcomingPanel.svelte';
	import {
		checkForHashImport,
		loadError,
		loadFromStorage,
		loadQuests,
		pendingHashImport
	} from '$lib/ransackStore';

	let showBackToTop = false;

	onMount(() => {
		const initialiseApp = async () => {
			loadFromStorage();
			await loadQuests();
			checkForHashImport();
		};

		initialiseApp();

		const handleScroll = () => {
			showBackToTop = window.scrollY > 400;
		};

		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});

	function scrollToTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
</script>

<svelte:head>
	<title>DDO Ransack Tracker</title>
	<meta
		name="description"
		content="Track chest ransack windows and raid lockouts across all your Dungeons & Dragons Online characters"
	/>
</svelte:head>

<main>
	<header>
		<a href="https://ddotools.xyz" class="back-to-main" title="Back to DDO Tools">
			← ddotools.xyz
		</a>
		<div class="header-title">
			<svg
				class="logo"
				viewBox="0 0 48 48"
				aria-hidden="true"
				fill="none"
				stroke="#d4af37"
				stroke-width="2.5"
				stroke-linejoin="round"
			>
				<path d="M6 20a18 10 0 0 1 36 0v18H6z" fill="rgba(212,175,55,0.12)" />
				<path d="M6 26h36" />
				<rect x="21" y="22" width="6" height="9" rx="1" fill="#252832" />
			</svg>
			<h1>DDO Ransack Tracker</h1>
		</div>
		<p>Chest ransack windows and raid lockouts, for every character you play</p>
	</header>

	{#if $loadError}
		<p class="load-error">{$loadError}</p>
	{/if}

	<div class="main-content">
		<div class="side-column">
			<CharacterPanel />
			<StatsPanel />
			<SettingsPanel />
		</div>

		<div class="tracker-column">
			<QuestSearch />
			<ListControls />
			<QuestList />
		</div>

		<div class="side-column">
			<UpcomingPanel />
		</div>
	</div>

	<footer>
		<p>
			The first chest you loot in a quest starts a <strong>168-hour</strong> window. You can loot up
			to <strong>8</strong> times inside it before named items stop dropping; further loots do not
			extend the window. Raid lockouts last <strong>2 days 18 hours</strong>.
		</p>
		<p class="disclaimer">
			Unofficial fan tool. Dungeons &amp; Dragons Online is a trademark of its respective owners.
		</p>
	</footer>
</main>

{#if $pendingHashImport}
	<ImportDialog />
{/if}

{#if showBackToTop}
	<button
		class="back-to-top"
		on:click={scrollToTop}
		title="Back to top"
		aria-label="Scroll back to top"
	>
		▲
	</button>
{/if}

<style>
	:global(body) {
		margin: 0;
		padding: 0;
		background-color: #252832;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		color: #e0e0e0;
	}

	main {
		max-width: 1400px;
		margin: 0 auto;
		padding: 2rem;
	}

	header {
		text-align: center;
		margin-bottom: 2rem;
		position: relative;
	}

	.back-to-main {
		position: absolute;
		top: 0;
		right: 0;
		color: #d4af37;
		text-decoration: none;
		font-size: 0.95rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		transition: all 0.2s ease;
	}

	.back-to-main:hover {
		color: #e6c547;
		background: rgba(212, 175, 55, 0.1);
	}

	.header-title {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}

	.logo {
		width: 48px;
		height: 48px;
	}

	header h1 {
		font-size: 2.5rem;
		color: white;
		margin: 0;
		font-weight: bold;
		text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
	}

	header p {
		color: #b0b0b0;
		font-size: 1.1rem;
		margin: 0;
	}

	.load-error {
		background: rgba(220, 53, 69, 0.12);
		border: 1px solid #dc3545;
		border-radius: 4px;
		color: #e4606d;
		padding: 0.75rem 1rem;
		margin-bottom: 1.5rem;
	}

	.main-content {
		display: grid;
		grid-template-columns: 280px minmax(0, 1fr) 300px;
		gap: 1.5rem;
		align-items: start;
	}

	.side-column {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		min-width: 0;
	}

	.tracker-column {
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	footer {
		margin-top: 2.5rem;
		border-top: 1px solid #404040;
		padding-top: 1rem;
		color: #888;
		font-size: 0.8rem;
		line-height: 1.6;
		text-align: center;
	}

	footer p {
		margin: 0 0 0.4rem;
	}

	footer strong {
		color: #d4af37;
	}

	.disclaimer {
		color: #5a5a5a;
	}

	@media (max-width: 1200px) {
		.main-content {
			grid-template-columns: 250px minmax(0, 1fr);
		}

		.main-content > .side-column:last-child {
			grid-column: 1 / -1;
			flex-direction: row;
			flex-wrap: wrap;
		}

		.main-content > .side-column:last-child > :global(*) {
			flex: 1 1 300px;
		}
	}

	@media (max-width: 900px) {
		.main-content {
			grid-template-columns: 1fr;
		}

		.main-content > .side-column:last-child {
			flex-direction: column;
		}
	}

	@media (max-width: 768px) {
		main {
			padding: 1rem;
		}

		.logo {
			width: 40px;
			height: 40px;
		}

		header h1 {
			font-size: 1.9rem;
		}

		.back-to-main {
			position: static;
			display: inline-block;
			margin-bottom: 0.5rem;
			font-size: 0.9rem;
		}
	}

	.back-to-top {
		position: fixed;
		bottom: 2rem;
		left: 2rem;
		width: 50px;
		height: 50px;
		background: #d4af37;
		color: #1a1a1a;
		border: none;
		border-radius: 50%;
		font-size: 1.5rem;
		font-weight: bold;
		cursor: pointer;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
		transition: all 0.3s ease;
		z-index: 1000;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.back-to-top:hover {
		background: #e6c547;
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5);
	}

	@media (max-width: 768px) {
		.back-to-top {
			bottom: 1rem;
			left: 1rem;
			width: 45px;
			height: 45px;
			font-size: 1.3rem;
		}
	}
</style>
