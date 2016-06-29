(function() { 'use strict'; // license: MPL-2.0

const HOVER_HIDE_DELAY = 800; // ms
const TOUCH_MODE_TIMEOUT = 100; // ms

/// RegExp to extract [ , origin, title, ] from fully qualified urls
const articleUrl = /^(https?:\/\/\w{2,20}(?:\.m)?\.wikipedia\.org)\/wiki\/([^:#?]*)$/;

const {
	concurrent: { async, spawn, sleep, },
	dom: { addStyle, createElement, once, },
	functional: { log, blockEvent, },
	network: { HttpRequest, },
} = require('es6lib');

const firefox = chrome.extension.getURL('.').startsWith('moz');

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
		#user-peek-root
		{
			display: none;
			position: absolute;
			padding: 0 10px;
			z-index: 999999;
			box-sizing: border-box;
			top: 0px;
			${ options.theme.value }
			font-size: ${ options.fontSize.value }%;
			opacity: ${ (1 - options.transparency.value / 100).toFixed(5) };
		}
		#user-peek-root:hover
		{
			display: unset;
		}
		@media screen and (-webkit-min-device-pixel-ratio:0)
		{ /* chrome only: fix missing mathML */
			#user-peek-root math *
			{
				display: unset !important;
			}
			#user-peek-root math annotation
			{
				display: none !important;
			}
		}
		a:not([href])
		{
			cursor: pointer;
		}
	`);
}

/// Url encoded title of the current article
const currentArticle = (window.location.href.match(articleUrl) || [ ])[2];

/// Map object of title ==> Preview
const Previews = window.Previews = { };

/**
 * Fetches the first paragraph of an article and registers it in Previews
 * @property {string}   html     Sanitized HTML
 * @property {Element}  content  .html in a <span>
 * @property {number}   width    The width .content should be displayed in
 * @param {string}  title   The url encoded title of the article
 * @param {string}  origin  The origin to query, defaults to location.origin
 */
function Preview(title, origin) {
	this.title = title;
	this.src = (origin || window.location.origin) +'/w/api.php?action=query&prop=extracts&format=json&exintro=&redirects=&titles='+ title;
	return (Previews[this.title] = HttpRequest({
		src: this.src, responseType: 'json',
	}).then(({ response, }) => {
		this.html = sanatize(this.originalHtml = response.query.pages[Object.keys(response.query.pages)[0]].extract);
		this.content = createElement('span', { innerHTML: this.html, });
		this.width = Math.floor(Math.sqrt(this.content.textContent.length) * 15);
		return this;
	})
	.catch(error => { delete Previews[this.title]; throw error; }));
}

/// Overlay singleton (getter)
const Overlay = (function() {
	let Overlay, root, content, lastTimeout, currentAnchor;
	const satuate = (left, width) => Math.min(Math.max(10, left), window.innerWidth - width - 10);

	const handlers = {
		click(event) {
			const { currentTarget: target, } = event;
			if (target === currentAnchor) { }
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
		]));
		onUnload.push(() => {
			root.remove();
			handlers.detatch();
			clearTimeout(lastTimeout);
			Overlay = root = content = lastTimeout = currentAnchor = null;
		});
		return (Overlay = {
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

				const position = anchor.getBoundingClientRect();
				const width = Math.min(preview.width * (options.fontSize.value * options.relativeWidth.value / 1e4), window.innerWidth - 40);

				root.style.top = (position.bottom + window.scrollY + 10) +'px';
				root.style.left = satuate(position.left + window.scrollX + position.width / 2 - width / 2, width) +'px';
				root.style.width = width +'px';

				root.style.display = 'unset';
				handlers.attach();
				return true;
			},
			hideSoon() {
				clearTimeout(lastTimeout);
				lastTimeout = setTimeout(Overlay.hide, HOVER_HIDE_DELAY);
			},
			hide() {
				handlers.detatch();
				clearTimeout(lastTimeout); lastTimeout = null;
				const anchor = currentAnchor; setTimeout(() => currentAnchor === anchor && (currentAnchor = null), 300); // delayed delete to prevent duplicate .show() just after .hide()
				root.style.display = '';
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

	const { title, origin, } = link.dataset;
	const preview = (yield Previews[title] || new Preview(title, origin));
	if (!link.matches(':hover')) { link.title = titleAttr; return; }

	Overlay().show(preview, link);

}, error => console.error(error.name, error.message, error.stack, error));

const onMouseDown = async(function*({ currentTarget: link, button, }) {
	if (button) {
		link.href = link.dataset.href;
		setTimeout(() => link.removeAttribute('href'), TOUCH_MODE_TIMEOUT);
		return;
	}

	if (!touchMode()) { window.location = link.dataset.href; return; }

	const { title, origin, } = link.dataset;
	const preview = (yield Previews[title] || new Preview(title, origin));

	if (
		!Overlay().show(preview, link)
	) { window.location = link.dataset.href; }

}, error => console.error(error.name, error.message, error.stack, error));

/**
 * Attach the onMouseEnter and onMouseDown event listeners to all links and set dataset[title, origin]
 */
Array.prototype.filter.call(document.querySelectorAll('a'), link => {
	const [ , origin, title, ] = (link.href.match(articleUrl) || [ ]);
	return title && title !== currentArticle && (link.dataset.title = title) && (window.location.origin === origin || (link.dataset.origin = origin));
}).forEach(link => {
	link.dataset.href = link.href; link.removeAttribute('href');
	link.addEventListener('mouseenter', onMouseEnter);
	link.addEventListener('mousedown', onMouseDown);
});
onUnload.push(() => Array.prototype.forEach.call(document.querySelectorAll('a'), link => {
	link.href = link.dataset.href;
	delete link.dataset.title; delete link.dataset.origin;
	link.removeEventListener('mouseenter', onMouseEnter);
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
