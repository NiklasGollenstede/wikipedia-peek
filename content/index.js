(function() { 'use strict'; // license: MPL-2.0

const HOVER_HIDE_DELAY = 800; // ms
const TOUCH_MODE_TIMEOUT = 500; // ms
const SPINNER_SIZE = 36; // px

/// RegExp to extract [ , origin, title, ] from fully qualified urls
const articleUrl = /^(https?:\/\/\w{2,20}(?:\.m)?\.wikipedia\.org)\/wiki\/([^:#?]*)$/;

/// Url encoded title of the current article
const currentArticle = (window.location.href.match(articleUrl) || [ ])[2];

const {
	concurrent: { async, spawn, sleep, },
	dom: { addStyle, createElement, once, getParent, },
	functional: { log, blockEvent, },
	network: { HttpRequest, },
} = require('es6lib');

/// Array of destructor functions, called when the extension is unloaded (disabled/removed/updated)
const onUnload = [ ];
chrome.runtime.connect({ name: 'tab', }).onDisconnect.addListener(() => {
	onUnload.forEach(destroy => { try { destroy(); } catch (error) { console.error(error); } });
});

/// Style element whose content is updated whenever the options change
const style = addStyle(''); onUnload.push(() => style.remove());

/// returns whether or not the screen has recently been touched and touch friendly behaviour should apply
let touchMode = () => false;
let lastTouch = 0; const touchEvents = [ 'touchstart', 'touchmove', 'touchend', ];
touchEvents.forEach(type => document.body.addEventListener(type, onTouch));
onUnload.push(() => touchEvents.forEach(type => document.body.removeEventListener(type, onTouch)));
function onTouch() { lastTouch = Date.now(); }

/// prevents the click event that would follow a mousedown event
const preventClick = (() => {
	let timeout;
	return () => {
		clearTimeout(timeout);
		document.addEventListener('click', blockEvent);
		timeout = setTimeout(() => {
			document.removeEventListener('click', blockEvent);
		}, TOUCH_MODE_TIMEOUT);
	};
})();

/// web-ext-utils/options/OptionList instance @see /common/options.js
let options;
require('common/options').then(root => {
	onUnload.push(() => root.destroy());
	options = root.children;
	root.onAnyChange(updateCSS);
	updateCSS();
	options.touchMode.whenChange(mode => touchMode = typeof mode === 'boolean' ? () => mode : () => {
		return lastTouch && Date.now() - lastTouch < TOUCH_MODE_TIMEOUT;
	});
});

function updateCSS() {
	style.textContent = (String.raw`
		#user-peek-root * {
			box-sizing: border-box;
		}

		#user-peek-root {
			position: absolute;
			z-index: 999999;
			opacity: ${ (1 - options.transparency.value / 100).toFixed(5) };
		}

		#user-peek-root.showing,
		#user-peek-root:hover:not(.loading) {
			background-color: inherit;
		}

		.showing>#user-peek-content,
		#user-peek-content:hover {
			display: block;
		}
		#user-peek-content {
			display: none;
			padding: 0 10px;
			${ options.theme.value }
			font-size: ${ options.fontSize.value }%;
		}

		.loading>#user-peek-loader {
			display: block;
		}
		#user-peek-loader {
			display: none;
			width: 1em; height: 1em;
			font-size: ${ SPINNER_SIZE }px;
			margin: 0; padding: 0;
			position: relative;
			border-radius: 50%;
			border: 4px solid rgba(190, 190, 190, 0.8);
			border-left-color: rgba(100, 100, 100, 0.8);
			animation: spin .8s infinite cubic-bezier(.3,.6,.8,.5);
		}
		@keyframes spin {
			0% { transform: rotate(0deg); }
			100% { transform: rotate(360deg); }
		}

		@media screen and (-webkit-min-device-pixel-ratio:0)
		{ /* webkit only: fix missing mathML */
			#user-peek-root math *
			{ display: inline !important; }
			#user-peek-root math annotation
			{ display: none !important; }
		}
	`);
}

/**
 * Fetches the first paragraph of an article and registers it in Previews
 * @property {string}   html     Sanitized HTML
 * @property {Element}  content  .html in a <span>
 * @property {number}   width    The width .content should be displayed in
 * @param {string}  title   The url encoded title of the article
 * @param {string}  origin  The origin to query, defaults to location.origin
 */
const Preview = ((title, origin) => {
	const cache = { };
	return function Preview(title, origin) {
		const key = (origin || '') +'?'+ title;
		if (cache[key]) { return cache[key]; }
		this.title = title;
		this.src = (origin || window.location.origin) +'/w/api.php?action=query&prop=extracts&format=json&exintro=&redirects=&titles='+ title;
		return (cache[key] = HttpRequest({
			src: this.src, responseType: 'json',
		}).then(({ response, }) => {
			this.html = sanatize(this.originalHtml = response.query.pages[Object.keys(response.query.pages)[0]].extract);
			this.content = createElement('span', { innerHTML: this.html, });
			this.width = Math.floor(Math.sqrt(this.content.textContent.length) * 15);
			return this;
		})
		.catch(error => { delete cache[key]; throw error; }));
	};
})();

/// Overlay singleton (getter)
const Overlay = (function() {
	let Overlay, root, content, lastTimeout, currentAnchor, pendingAnchor;
	const satuate = (left, width) => Math.min(Math.max(10, left), window.innerWidth - width - 10);

	const handlers = {
		click(event) {
			const target = getParent(event.target, 'a');
			if (target === currentAnchor || target === pendingAnchor) { }
			else if (!target.matches || !target.matches('#user-peek-root, #user-peek-root *')) { event.preventDefault(); }
			else { return; }
			Overlay.hide();
		},
		mouseleave() {
			!touchMode() && Overlay.hideSoon();
		},
		attach() {
			setTimeout(() => document.addEventListener('click', handlers.click), 500);
			currentAnchor.addEventListener('mouseleave', handlers.mouseleave);
		},
		detatch() {
			document.removeEventListener('click', handlers.click);
			currentAnchor && currentAnchor.removeEventListener('mouseleave', handlers.mouseleave);
		},
	};

	function create() {
		root = document.body.appendChild(createElement('div', {
			id: 'user-peek-root',
		}, [
			content = createElement('div', {
				id: 'user-peek-content',
			}),
			createElement('div', {
				id: 'user-peek-loader',
			}),
		]));
		onUnload.push(() => {
			root.remove();
			handlers.detatch();
			clearTimeout(lastTimeout);
			Overlay = root = content = lastTimeout = currentAnchor = null;
		});
		return (Overlay = {
			load(anchor) {
				const { title, origin, } = anchor.dataset;
				root.classList.add('loading');
				root.classList.remove('showing');
				clearTimeout(lastTimeout); lastTimeout = null;
				const position = anchor.getBoundingClientRect();
				root.style.top = window.scrollY + position.top + position.height / 2 - SPINNER_SIZE / 2 +'px';
				root.style.left = window.scrollX + position.left + position.width / 2 - SPINNER_SIZE / 2 +'px';
				pendingAnchor = anchor;
				return new Preview(title, origin).then(preview => {
					Overlay.hide();
					return preview;
				});
			},
			/**
			 * Shows a Preview next to an Element until shortly after the cursor left that element
			 * @param  {Preview}  preview  A loaded Preview object
			 * @param  {Element}  anchor   A Element the mouse courser is currently hovering over
			 */
			show(preview, anchor) {
				if (currentAnchor === anchor) { return false; }
				Overlay.hide();
				currentAnchor = anchor;
				content.textContent = '';
				content.appendChild(preview.content);
				content.preview = preview;

				const position = anchor.getBoundingClientRect();
				const width = Math.min(preview.width * (options.fontSize.value * options.relativeWidth.value / 1e4), window.innerWidth - 40);

				root.style.top = (position.bottom + window.scrollY + 10) +'px';
				root.style.left = satuate(position.left + window.scrollX + position.width / 2 - width / 2, width) +'px';
				root.style.width = width +'px';

				root.classList.add('showing');
				handlers.attach();
				return true;
			},
			hideSoon() {
				clearTimeout(lastTimeout);
				lastTimeout = setTimeout(Overlay.hide, HOVER_HIDE_DELAY);
			},
			hide() {
				root.classList.remove('loading');
				root.classList.remove('showing');
				handlers.detatch();
				clearTimeout(lastTimeout); lastTimeout = null;
				pendingAnchor = null;
				const anchor = currentAnchor; setTimeout(() => currentAnchor === anchor && (currentAnchor = null), 300); // delayed delete to prevent duplicate .show() just after .hide()
			},
			get loading() {
				return pendingAnchor;
			},
			get showing() {
				return currentAnchor;
			},
		});
	}
	return () => Overlay || create();
})();

/**
 * Primary event listeners. Called when an applicable link is hovered or touched.
 */
const onMouseEnter = async(function*({ currentTarget: link, }) {
	if (touchMode()) { return; }
	const titleAttr = link.title; link.title = '';
	(yield sleep(options.showDelay.value));
	if (!link.matches(':hover')) { link.title = titleAttr; return; }

	if (Overlay().loading === link || Overlay().showing === link) { return; }
	const preview = (yield Overlay().load(link));
	if (!link.matches(':hover')) { link.title = titleAttr; return; }

	Overlay().show(preview, link);

}, error => console.error(error));

function onTouchEnd(event) {
	if (
		event.touches.length !== 0 || event.targetTouches.length !== 0
		|| event.changedTouches.length !== 1
		|| event.changedTouches.item(0).target !== this
	) { return; }
	blockEvent(event);
	preventClick();
	showOrNavigate(this);
}

function onMouseDown(event) {
	if (event.button || !touchMode()) { return; }
	preventClick();
	showOrNavigate(this);
}

function showOrNavigate(link) {
	const { title, origin, } = link.dataset;
	if (Overlay().loading === link) { return; }
	if (Overlay().showing === link) { window.location = link.href; return; }
	Overlay().load(link)
	.then(preview => !Overlay().show(preview, link));
}

/**
 * Attach the onMouseEnter and onMouseDown event listeners to all links and set dataset[title, origin]
 */
Array.prototype.filter.call(document.querySelectorAll('a'), link => {
	const [ , origin, title, ] = (link.href.match(articleUrl) || [ ]);
	const sameOrigin = window.location.origin === origin;
	return title && (title !== currentArticle || !sameOrigin) && (link.dataset.title = title) && (sameOrigin || (link.dataset.origin = origin));
}).forEach(link => {
	link.addEventListener('mouseenter', onMouseEnter);
	link.addEventListener('touchend', onTouchEnd);
	link.addEventListener('mousedown', onMouseDown);
});
onUnload.push(() => Array.prototype.forEach.call(document.querySelectorAll('a'), link => {
	delete link.dataset.title; delete link.dataset.origin;
	link.removeEventListener('mouseenter', onMouseEnter);
	link.removeEventListener('touchend', onTouchEnd);
	link.removeEventListener('mousedown', onMouseDown);
}));

/**
 * Removes any tags (not their content) that are not listed in 'allowed' and any attributes except for href (not data: or javascript:) and title (order must be href, title)
 * @param  {string}  html  Untrusted HTML markup
 * @return {[type]}        Sanitized, undangerous, simple HTML
 */
function sanatize(html) {
	const allowed = /^(?:a|b|big|br|code|div|i|p|pre|li|ol|ul|span|sup|sub|tt|math|semantics|annotation(?:-xml)?|m(?:enclose|error|fenced|frac|i|n|o|over|padded|root|row|s|space|sqrt|sub|supsubsup|table|td|text|tr|under|underover))$/;
	return html.replace(
		(/<(\/?)(\w+)[^>]*?(\s+href="(?!(javascript|data):)[^"]*?")?(\s+title="[^"]*?")?[^>]*?>/g),
		(match, slash, tag, href, title) => allowed.test(tag) ? ('<'+ slash + tag + (title || '') + (href ? href +'target="_blank"' : '') +'>') : ''
	);
}

})();
