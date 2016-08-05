(function() { 'use strict'; // license: MPL-2.0

const HOVER_HIDE_DELAY = 800; // ms
const TOUCH_MODE_TIMEOUT = 500; // ms
const SPINNER_SIZE = 36; // px

/// RegExp to extract [ , origin, title, ] from fully qualified urls
const articleUrl = /^(https?:\/\/[\w\-\.]{1,63}?(?:\.m)?\.(?:wikipedia\.org|mediawiki\.org|wikia\.com))\/wiki\/([^:?]*)$/;

/// Url encoded title of the current article
const currentArticle = new RegExp('^'+ (window.location.href.match(articleUrl) || [ '', '', '', ])[2].replace(/[\-\[\]\{\}\(\)\*\+\?\.\,\\\/\^\$\|\#\s]/g, '\\$&') +String.raw`(?:$|\#|\:|\?)`);

const {
	concurrent: { async, spawn, sleep, },
	dom: { addStyle, createElement, once, getParent, },
	functional: { log, blockEvent, fuzzyMatch, },
	network: { HttpRequest, },
} = require('es6lib');

/// Array of destructor functions, called when the extension is unloaded (disabled/removed/updated)
const onUnload = [ ];
const destroy = window.destroy = function destroy() {
	onUnload.forEach(destroy => { try { destroy(); } catch (error) { console.error(error); } });
};
chrome.runtime.connect({ name: 'tab', }).onDisconnect.addListener(destroy);

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
	let [ , text, background, border, ] = (/([^\s]+);.*?([^\s]+);.*?([^\s]+);$/).exec(options.theme.value) || Array(4).fill('inherit');
	background === 'inherit' && (background = getComputedStyle(document.body).backgroundColor);
	border === 'inherit' && (border = getComputedStyle(document.body).borderColor);
	style.textContent = (String.raw`
		#user-peek-root * {
			box-sizing: border-box;
		}

		#user-peek-root {
			position: absolute;
			z-index: 999999;
			font-size: ${ options.fontSize.value }%;
		}

		#user-peek-root.loading {
			pointer-events: none;
		}

		.showing>#user-peek-content,
		#user-peek-content:hover {
			display: block;
		}
		#user-peek-content {
			display: none;
			padding: 5px 10px;
			color: ${ text };
			border: 1px solid transparent;
			hyphens: auto;
			-ms-hyphens: auto;
			-webkit-hyphens: auto;
			position: relative;
			z-index: 1;
		}
		#user-peek-content::before {
			content: "";
			position: absolute;
			top: 0;
			left: 0;
			width: 100%;
			height: 100%;
			z-index: -1;
			background: ${ background };
			border: 1px solid;
			border-color: ${ border };
			opacity: ${ (1 - options.transparency.value / 100).toFixed(5) };
		}
		#user-peek-content>span>:first-child {
			margin-top: 0;
		}
		#user-peek-content>span>:last-child {
			margin-bottom: 0;
		}
		#user-peek-thumb {
			float: right;
			margin: 5px 0 3px 10px;
			width: auto; height: auto;
		}
		#user-peek-content ul {
			list-style: none;
			margin-left: 0;
		}
		#user-peek-content ul>li {
			padding-left: 1em;
		}
		#user-peek-content ul>li:before {
			content: "•";
			position: absolute;
			left: 0.7em;
		}
		#user-peek-content ol {
			margin-left: 1.2em;
		}

		#user-peek-loader {
			display: none;
		}
		.loading>#user-peek-loader {
			display: block;
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
		this.origin = origin || window.location.origin;
		this.isWikia = this.origin.endsWith('wikia.com');
		this.section = title.split('#')[1];
		const thumbPx = options.thumb.children.size.value * devicePixelRatio;

		if (this.isWikia) {
			this.src = this.origin
			+ '/api/v1/Articles/Details/?abstract=500' // 500 is max
			+ '&width='+ thumbPx // +'&height='+ thumbPx
			+ '&titles='+ encodeURIComponent(title);
		} else {
			this.src = this.origin
			+ '/w/api.php?action=query&format=json&formatversion=2&redirects='
			+ '&prop=extracts|pageimages'
			+ (this.section ? '' : '&exintro=')
			+ '&piprop=thumbnail|original&pithumbsize='+ thumbPx
			+ '&titles='+ encodeURIComponent(title);
		}

		return (cache[key] = HttpRequest({
			src: this.src, responseType: 'json',
		}).then(({ response, }) => {
			let thumb = null;
			if (this.isWikia) {
				const page = response.items[Object.keys(response.items)[0]];

				if (/^REDIRECT /.test(page.abstract)) {
					return (cache[key] = new Preview(page.abstract.slice(9), origin));
				}

				thumb = page.thumbnail && {
					source: page.thumbnail
					.replace(/\/x-offset\/\d+/, '/x-offset/0').replace(/\/window-width\/\d+/, '/window-width/'+ page.original_dimensions.width)
					.replace(/\/y-offset\/\d+/, '/y-offset/0').replace(/\/window-height\/\d+/, '/window-height/'+ page.original_dimensions.height),
					width: thumbPx, height: page.original_dimensions.height / page.original_dimensions.width * thumbPx,
				};
				if (this.section) {
					return HttpRequest({
						src: this.origin +'/api/v1/Articles/AsSimpleJson?id='+ page.id,
						responseType: 'json',
					}).then(({ response, }) => {
						const section = fuzzyFind(response.sections.map(_=>_.title), this.section.replace(/_/g, ' '));
						this.html = sanatize(
							response.sections.find(_=>_.title === section).content
							.filter(_=>_.type === 'paragraph')
							.map(({ text, }) => `<p>${ text }</p>`).join('')
						);
						return finish.call(this);
					});
				} else {
					this.html = sanatize(`<p>${ page.abstract }</p>`);
					return finish.call(this);
				}
			} else {
				const page = this.page = response.query.pages[0];

				const redirect = response.query.redirects && response.query.redirects[0] || { };
				if (!this.section && redirect.tofragment) {
					return (cache[key] = new Preview(redirect.to +'#'+ redirect.tofragment, origin));
				} else {
					redirect.tofragment && (this.section = redirect.tofragment);
				}

				thumb = options.thumb.value && page.thumbnail;
				this.html = sanatize(extractSection(page.extract, this.section).replace(/<p>\s*<\/p>/, ''));
				return finish.call(this);
			}

			function finish() {
				this.thumb = thumb && createElement('img', { src: thumb.source, id: 'user-peek-thumb', alt: 'loading...', style: {
					width: thumb.width / devicePixelRatio +'px', height: thumb.height / devicePixelRatio +'px',
				}, });
				this.content = createElement('span', { innerHTML: this.html, });
				this.textSize = this.content.textContent.length * 225;
				this.thumbSize = thumb ? (thumb.height / devicePixelRatio + 20) * (thumb.width / devicePixelRatio + 20) : 0;
				this.minHeight = thumb ? (thumb.height / devicePixelRatio + 20) : 0;
				return this;
			}
		})
		.catch(error => { delete cache[key]; throw error; }));
	};
})();

/// Overlay singleton (getter)
const Overlay = (function() {
	let Overlay, root, content, lastTimeout, currentAnchor, pendingAnchor;
	const satuate = (left, width) => Math.min(Math.max(10, left), document.documentElement.clientWidth - width - 10);

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
			Overlay = root = content = lastTimeout = currentAnchor = pendingAnchor = null;
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
				return new Preview(title, origin)
				.then(value => { Overlay.hide(); return value; })
				.catch(error => { Overlay.hide(); throw error; });
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
				preview.thumb && content.appendChild(preview.thumb);
				content.appendChild(preview.content);
				content.style.minHeight = preview.minHeight +'px';
				content.preview = preview;

				const position = anchor.getBoundingClientRect();
				const width = Math.min(
					Math.sqrt(preview.textSize * Math.pow(options.fontSize.value * options.relativeWidth.value / 1e4, 2) + preview.thumbSize),
					document.documentElement.clientWidth - 20
				);

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
	return title
	&& (!currentArticle.test(title) || !sameOrigin) && (link.dataset.title = title)
	&& (sameOrigin || (link.dataset.origin = origin));
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
		(/<(\/?)(\w+)[^>]*?(\s+href="(?!(?:javascript|data):)[^"]*?")?(\s+title="[^"]*?")?[^>]*?>/g),
		(match, slash, tag, href, title) => allowed.test(tag) ? ('<'+ slash + tag + (title || '') + (href ? href +'target="_blank"' : '') +'>') : ''
	);
}

/**
 * Extracts a #section from an article
 * @param  {string}  html  HTML markup
 * @param  {string}  id    Optional id of the section to extract
 * @return {string}        The HTML section between a header section that contains an `id=${ id }` and the next header section
 */
function extractSection(html, id) {
	if (!id) { return html; }

	// the ids linked tend to be incorrect, so this finds the closest one actually present
	const ids = [ ], getId = (/id="(.*?)"/g); let m; while ((m = getId.exec(html))) { ids.push(m[1]); }
	const _id = fuzzyFind(ids, id);

	const exp = new RegExp(String.raw`id="${ _id }"[^]*?\/h\d>[^]*?(<[a-gi-z][a-z]*>[^]*?)(?:<h\d|$)`, 'i');
	const match = exp.exec(html);
	if (!match) { console.error(`Failed to extract section "${ id }" /${ exp.source }/ from ${ html }`); return html; }
	return match[1];
}

/**
 * Finds the string in an array that best matches the search string.
 * @param  {[string]}  array   The array in which to search.
 * @param  {string}    string  The string for which to search.
 * @return {string}            The string in an array that best matches the search string.
 */
function fuzzyFind(array, string) {
	const norms = array.map(item => fuzzyMatch(string, item, 2));
	return array[norms.indexOf(norms.reduce((a, b) => a >= b ? a : b))];
}

})();
