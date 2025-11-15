<script lang="ts">
	import TmcpAnimated from '$lib/components/logos/tmcp-animated.svelte';
	import Tmcp from '$lib/components/logos/tmcp.svelte';
	// @ts-expect-error no dts for md files
	import Example from './example-1.md';
	// @ts-expect-error no dts for md files
	import Example2 from './example-2.md';
</script>

<div class="accent-shape"></div>
<div class="accent-shape"></div>

<header>
	<div class="container">
		<nav>
			<div class="flex items-center gap-2">
				<Tmcp logotype={false} width="40px" height="40px" />
			</div>
			<ul class="nav-links">
				<li><a href="/docs">docs</a></li>
				<li>
					<a href="https://github.com/paoloricciuti/tmcp">github</a>
				</li>
			</ul>
		</nav>
	</div>
</header>

<main>
	<section class="hero">
		<div class="container flex gap-4">
			<div class="hero-content">
				<h1>Modern, Flexible, Composable MCP servers SDK</h1>
				<p>
					TMCP is a powerful TypeScript SDK that makes building MCP
					servers elegant, type-safe, and effortless. Ship
					production-ready servers in minutes, not hours.
				</p>
				<div class="cta-group">
					<a href="/docs/getting-started" class="btn btn-primary"
						>Get Started</a
					>
				</div>
			</div>
			<TmcpAnimated class="hidden lg:block" />
		</div>
	</section>

	<section class="code-section">
		<div class="container">
			<div class="section-header">
				<h2>Write Less. Build More.</h2>
				<p>Intuitive APIs that feel natural to TypeScript developers</p>
				<div
					class="dark text-left grid grid-cols-1 lg:grid-cols-2 gap-4 [&_pre]:p-4"
				>
					<Example />
					<Example2 />
				</div>
			</div>
		</div>
	</section>

	<section class="features">
		<div class="container">
			<div class="section-header">
				<h2>Everything You Need</h2>
				<p>Built for developers who demand quality and speed</p>
			</div>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">&lt;/&gt;</div>
					<h3>Type-Safe</h3>
					<p>
						Full TypeScript support with intelligent autocomplete
						and compile-time validation. Catch errors before they
						reach production.
					</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">⚡</div>
					<h3>Lightning Fast</h3>
					<p>
						Optimized for performance with minimal overhead. Built
						on modern async patterns that scale effortlessly.
					</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🔧</div>
					<h3>Developer First</h3>
					<p>
						Intuitive APIs designed around your workflow. Less
						boilerplate, more functionality. Build servers in
						minutes.
					</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🚀</div>
					<h3>Modern</h3>
					<p>
						Use it with your favorite framework without any extra
						work. `tmcp` is based on Web Request and Web Response,
						the standard way of building MCP servers nowadays.
					</p>
				</div>
			</div>
		</div>
	</section>
</main>

<style>
	:root {
		--bg-primary: #0f0f11;
		--bg-secondary: #18181b;
		--bg-tertiary: #1c242f;
		--accent-orange: #ff3e00;
		--text-primary: #e6edf3;
		--text-secondary: #8b949e;
		--border: #2d3748;
		--code-bg: #0d1117;
		--shadow: rgba(0, 229, 255, 0.15);
	}

	* {
		margin: 0;
		padding: 0;
		box-sizing: border-box;
	}

	:global(body) {
		font-family: sans-serif;
		background: var(--bg-primary);
		color: var(--text-primary);
		line-height: 1.6;
		overflow-x: hidden;
	}

	/* Animated grid background */
	:global(body)::before {
		content: '';
		position: fixed;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-image:
			linear-gradient(
				90deg,
				rgba(0, 229, 255, 0.03) 1px,
				transparent 1px
			),
			linear-gradient(rgba(0, 229, 255, 0.03) 1px, transparent 1px);
		background-size: 40px 40px;
		pointer-events: none;
		z-index: 0;
		animation: grid-move 20s linear infinite;
	}

	@keyframes grid-move {
		0% {
			transform: translate(0, 0);
		}
		100% {
			transform: translate(40px, 40px);
		}
	}

	/* Floating accent shapes */
	.accent-shape {
		position: absolute;
		border: 2px solid;
		opacity: 0.1;
		pointer-events: none;
		animation: float 15s ease-in-out infinite;
	}

	.accent-shape:nth-child(1) {
		width: 300px;
		height: 300px;
		border-color: var(--accent-orange);
		top: 10%;
		right: 5%;
		border-radius: 50%;
		animation-delay: 0s;
	}

	.accent-shape:nth-child(2) {
		width: 200px;
		height: 200px;
		border-color: var(--accent-orange);
		top: 20%;
		right: 20%;
		animation-delay: 5s;
	}

	@keyframes float {
		0%,
		100% {
			transform: translate(0, 0) rotate(0deg);
		}
		33% {
			transform: translate(30px, -30px) rotate(120deg);
		}
		66% {
			transform: translate(-20px, 20px) rotate(240deg);
		}
	}

	.container {
		max-width: 1400px;
		margin: 0 auto;
		padding: 0 2rem;
		position: relative;
		z-index: 1;
	}

	/* Header */
	header {
		padding: 2rem 0;
		border-bottom: 1px solid var(--border);
		background: rgba(10, 14, 20, 0.8);
		backdrop-filter: blur(10px);
		position: sticky;
		top: 0;
		z-index: 100;
		animation: slideDown 0.8s ease-out;
	}

	@keyframes slideDown {
		from {
			transform: translateY(-100%);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}

	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.nav-links {
		display: flex;
		gap: 2.5rem;
		list-style: none;
	}

	.nav-links a {
		font-family: monospace;
		color: var(--text-secondary);
		text-decoration: none;
		font-size: 0.9rem;
		transition:
			color 0.3s ease,
			transform 0.3s ease;
		position: relative;
	}

	.nav-links a::before {
		content: '>';
		position: absolute;
		left: -15px;
		opacity: 0;
		color: var(--accent-orange);
		transition: opacity 0.3s ease;
	}

	.nav-links a:hover {
		color: var(--accent-orange);
		transform: translateX(10px);
	}

	.nav-links a:hover::before {
		opacity: 1;
	}

	/* Hero Section */
	.hero {
		padding: 8rem 0 6rem;
		position: relative;
		animation: fade-in-up 1s ease-out;
	}

	.code-section {
		padding: 8rem 0 6rem;
		position: relative;
		animation: fade-in-up 1s ease-out;
	}

	@keyframes fade-in-up {
		from {
			opacity: 0;
			transform: translateY(40px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.hero-content {
		max-width: 800px;
	}

	h1 {
		font-size: clamp(3rem, 8vw, 5.5rem);
		font-weight: 600;
		line-height: 1.1;
		margin-bottom: 1.5rem;
		background: linear-gradient(
			135deg,
			var(--text-primary) 0%,
			var(--accent-orange) 100%
		);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
		animation: fade-in-up 1s ease-out 0.4s both;
	}

	.hero p {
		font-size: 1.25rem;
		color: var(--text-secondary);
		margin-bottom: 3rem;
		line-height: 1.8;
		animation: fade-in-up 1s ease-out 0.6s both;
	}

	.cta-group {
		display: flex;
		gap: 1.5rem;
		flex-wrap: wrap;
		animation: fade-in-up 1s ease-out 0.8s both;
	}

	.btn {
		font-family: 'Azeret Mono', monospace;
		padding: 1rem 2.5rem;
		text-decoration: none;
		font-size: 1rem;
		font-weight: 600;
		border: 2px solid;
		transition: all 0.3s ease;
		position: relative;
		overflow: hidden;
		display: inline-block;
	}

	.btn-primary {
		background: var(--accent-orange);
		border-color: var(--accent-orange);
		color: var(--bg-primary);
	}

	.btn-primary::before {
		content: '';
		position: absolute;
		top: 0;
		left: -100%;
		width: 100%;
		height: 100%;
		background: var(--text-primary);
		transition: left 0.3s ease;
		z-index: -1;
	}

	.btn-primary:hover::before {
		left: 0;
	}

	.btn-primary:hover {
		transform: translateY(-2px);
		box-shadow: 0 10px 30px var(--shadow);
	}

	.section-header {
		text-align: center;
		margin-bottom: 4rem;
	}

	.section-header h2 {
		font-size: clamp(2rem, 5vw, 3rem);
		margin-bottom: 1rem;
		animation: fade-in-up 1s ease-out both;
	}

	.section-header p {
		font-size: 1.1rem;
		color: var(--text-secondary);
		animation: fade-in-up 1s ease-out 0.2s both;
	}

	/* Features Grid */
	.features {
		padding: 6rem 0;
		background: var(--bg-secondary);
		position: relative;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 2rem;
		margin-top: 4rem;
	}

	.feature-card {
		padding: 2.5rem;
		background: var(--bg-primary);
		border: 1px solid var(--border);
		border-radius: 8px;
		transition: all 0.4s ease;
		animation: fade-in-up 1s ease-out both;
	}

	.feature-card:hover {
		transform: translateY(-10px);
		border-color: var(--accent-orange);
		box-shadow: 0 20px 60px rgba(0, 229, 255, 0.15);
	}

	.feature-icon {
		width: 60px;
		height: 60px;
		background: var(--bg-tertiary);
		border: 2px solid var(--accent-orange);
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-family: 'Azeret Mono', monospace;
		font-size: 1.5rem;
		color: var(--accent-orange);
		margin-bottom: 1.5rem;
		transition: all 0.3s ease;
	}

	.feature-card:hover .feature-icon {
		transform: rotate(5deg) scale(1.1);
		background: var(--accent-orange);
		color: var(--bg-primary);
	}

	.feature-card h3 {
		font-size: 1.5rem;
		margin-bottom: 1rem;
		color: var(--text-primary);
	}

	.feature-card p {
		color: var(--text-secondary);
		line-height: 1.7;
	}

	@media (max-width: 768px) {
		.nav-links {
			gap: 1.5rem;
		}

		.hero {
			padding: 4rem 0 3rem;
		}

		.cta-group {
			flex-direction: column;
		}

		.btn {
			text-align: center;
		}
	}
</style>
