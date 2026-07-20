<script>
	/**
	 * ModalShell — the one canonical dialog shell for the SoftStack fleet
	 * (Svelte flavor; the Preact twin is ModalShell.tsx + useModalShell.ts).
	 *
	 * Owns ALL the machinery every app used to hand-roll per modal: backdrop
	 * + click-outside, Escape, body scroll-lock, focus trap + focus restore,
	 * the close-out animation, and reduced-motion. Content comes in through
	 * the default slot; each modal keeps its own body styles.
	 *
	 * Lifecycle contract: the PARENT owns `open`. Keep the component mounted
	 * and flip `open` false only in response to `on:close` — the shell plays
	 * its exit animation first, then dispatches. (Unmounting the whole
	 * component or flipping `open` yourself skips the exit animation.)
	 *
	 * Styling lives in modal-shell.css (imported here, shared with the Preact
	 * flavor) — skin it per app via the --charm-modal-* tokens, never by
	 * editing the css. Close timing has ONE source of truth: the
	 * --charm-modal-close-ms token, read off the card at close time.
	 *
	 * Self-contained: copy this folder verbatim into an app, no other files.
	 */
	import { createEventDispatcher, onDestroy, tick } from 'svelte';
	import './modal-shell.css';

	/** Parent-owned open state. */
	export let open = false;
	/** id of the heading element inside your slot content (aria-labelledby). */
	export let labelledby = undefined;
	/** Max card width — the card renders at min(92vw, maxWidth). */
	export let maxWidth = '24rem';
	/** Tall content scrolls inside the card (pair with .cute-scroll). */
	export let scrollable = false;
	/** Escape + backdrop click close the modal. false = explicit close only. */
	export let dismissible = true;
	/** Render the tucked squishy × button. */
	export let showClose = true;
	/** Exit ms override. null = read --charm-modal-close-ms off the card. */
	export let closeMs = null;

	const DEFAULT_CLOSE_MS = 160;
	const FOCUSABLE =
		'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
		'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

	const dispatch = createEventDispatcher();
	const hasDoc = typeof document !== 'undefined';

	let backdropEl;
	let dialogEl;
	let closing = false;
	let closeTimer = null;
	let lastFocused = null;
	let scrollLocked = false;
	let prevOverflow = '';

	$: if (open) onOpen();
	$: if (!open) onExternalClose();

	async function onOpen() {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
		closing = false;
		if (!hasDoc) return;
		lastFocused = document.activeElement;
		lockScroll();
		await tick();
		dialogEl?.focus();
	}

	// Parent flipped `open` false (normally in response to our on:close, but
	// also covers programmatic closes) — release everything, no animation.
	function onExternalClose() {
		if (closeTimer) {
			clearTimeout(closeTimer);
			closeTimer = null;
		}
		closing = false;
		unlockScroll();
	}

	/** Play the exit animation, restore focus, then dispatch 'close'. Also
	 * passed to the slot as `let:requestClose` for in-body Done buttons. */
	function requestClose() {
		if (closing || !open) return;
		closing = true;
		const finish = () => {
			closeTimer = null;
			if (lastFocused && typeof lastFocused.focus === 'function') {
				lastFocused.focus();
			}
			dispatch('close');
		};
		if (prefersReducedMotion()) finish();
		else closeTimer = setTimeout(finish, resolveCloseMs());
	}

	function onBackdropClick(e) {
		if (dismissible && e.target === backdropEl) requestClose();
	}

	function onKeydown(e) {
		if (!open || closing) return;
		if (e.key === 'Escape' && dismissible) {
			e.preventDefault();
			requestClose();
		} else if (e.key === 'Tab') {
			trapTab(e);
		}
	}

	// Keep Tab cycling inside the dialog while it is open.
	function trapTab(e) {
		if (!dialogEl) return;
		const focusables = dialogEl.querySelectorAll(FOCUSABLE);
		if (!focusables.length) {
			e.preventDefault();
			dialogEl.focus();
			return;
		}
		const first = focusables[0];
		const last = focusables[focusables.length - 1];
		const active = document.activeElement;
		const inside = dialogEl.contains(active);
		if (e.shiftKey && (!inside || active === first || active === dialogEl)) {
			e.preventDefault();
			last.focus();
		} else if (!e.shiftKey && (!inside || active === last)) {
			e.preventDefault();
			first.focus();
		}
	}

	function lockScroll() {
		if (scrollLocked || !hasDoc) return;
		prevOverflow = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		scrollLocked = true;
	}

	function unlockScroll() {
		if (!scrollLocked || !hasDoc) return;
		document.body.style.overflow = prevOverflow;
		scrollLocked = false;
	}

	// One source of truth for close timing: the CSS token on the card.
	function resolveCloseMs() {
		if (closeMs != null) return closeMs;
		if (dialogEl && typeof getComputedStyle === 'function') {
			const raw = getComputedStyle(dialogEl)
				.getPropertyValue('--charm-modal-close-ms')
				.trim();
			const n = parseFloat(raw);
			if (!Number.isNaN(n)) {
				return raw.endsWith('ms') || !raw.endsWith('s') ? n : n * 1000;
			}
		}
		return DEFAULT_CLOSE_MS;
	}

	function prefersReducedMotion() {
		if (typeof window === 'undefined' || !window.matchMedia) return false;
		try {
			return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		} catch {
			return false;
		}
	}

	onDestroy(() => {
		if (closeTimer) clearTimeout(closeTimer);
		unlockScroll();
	});
</script>

<svelte:window on:keydown={onKeydown} />

{#if open || closing}
	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions a11y-click-events-have-key-events a11y-no-static-element-interactions -->
	<div
		class="charm-modal-backdrop"
		class:charm-modal--closing={closing}
		role="presentation"
		bind:this={backdropEl}
		on:click={onBackdropClick}
	>
		<div
			class="charm-modal"
			class:charm-modal--closing={closing}
			class:charm-modal--scrollable={scrollable}
			style="width: min(92vw, {maxWidth})"
			role="dialog"
			aria-modal="true"
			aria-labelledby={labelledby}
			tabindex="-1"
			bind:this={dialogEl}
		>
			{#if showClose}
				<button
					type="button"
					class="charm-modal-close"
					aria-label="Close"
					on:click={requestClose}>×</button
				>
			{/if}
			<slot {requestClose} />
		</div>
	</div>
{/if}
