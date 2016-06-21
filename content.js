'use strict'; self.port.once('init', __prefs__ => { /* globals clearTimeout, setTimeout */

const HOVER_HIDE_DELAY = 800; // ms

const articleUrl = /^(https?:\/\/\w{2,20}\.wikipedia\.org)\/wiki\/([^:]*?)(?:[#?].*)?$/; // [ href, origin, title, ]

const {
	concurrent: { async, spawn, sleep, },
	dom: { addStyle, createElement, once, },
	functional: { log, },
	network: { HttpRequest, },
} = require('es6lib');

const Prefs = { prefs: __prefs__, on(branch, listener) { self.port.on('prefs/'+ branch, listener); }, };
self.port.on('prefs/', prefs => Object.assign(Prefs.prefs, prefs));

const CSS = ({ theme, fontSize, transparency, }) => (String.raw`
#user-peek-root
{
	display: none;
	position: absolute;
	padding: 0 10px;
	z-index: 999999;
	box-sizing: border-box;
	top: 0px;
	${ theme }
	font-size: ${ fontSize }%;
	opacity: ${ (1 - transparency / 100).toFixed(5) };
}
#user-peek-root:hover
{
	display: unset;
}
`);

let style = addStyle(CSS(Prefs.prefs));

Prefs.on('', () => (style && style.remove()) === (style = addStyle(CSS(Prefs.prefs))));

const currentArticle = (window.location.href.match(articleUrl) || [ ])[2];

const Previews = { };

function Preview(title, origin) {
	this.title = title;
	this.src = (origin || window.location.origin) +'/w/api.php?action=query&prop=extracts&format=json&exintro=&redirects=&titles='+ title;
	return HttpRequest({
		src: this.src, responseType: 'json',
	}).then(({ response, }) => {
		// this.originalHtml = response.query.pages[Object.keys(response.query.pages)[0]].extract;
		this.html = sanatize(response.query.pages[Object.keys(response.query.pages)[0]].extract)
		.replace(/  /g, () => ' \uD83D\uDD34 '); // mark locations where .tex images are missing with a red '🔴' char
		this.content = createElement('span', { innerHTML: this.html, });
		this.width = Math.floor(Math.sqrt(this.content.textContent.length) * 15);
		Previews[this.title] = this;
		return this;
	});
}

const Overlay = (function() {
	let Overlay, root, content, lastTimeout;
	const satuate = (left, width) => Math.min(Math.max(10, left), window.innerWidth - width - 10);
	function create() {
		root = document.body.appendChild(createElement('div', {
			id: 'user-peek-root',
		}, [
			content = createElement('div', {
				id: 'user-peek-content',
			}),
		]));
		return Overlay = {
			show(preview, anchor) {
				content.textContent = '';
				content.appendChild(preview.content);

				const position = anchor.getBoundingClientRect();
				const width = Math.min(preview.width * (Prefs.prefs.fontSize * Prefs.prefs.relativeWidth / 1e4), window.innerWidth - 40);

				root.style.top = (position.bottom + window.scrollY + 10) +'px';
				root.style.left = satuate(position.left + window.scrollX + position.width / 2 - width / 2, width) +'px';
				root.style.width = width +'px';

				root.style.display = 'unset';
				clearTimeout(lastTimeout);
				once(anchor, 'mouseleave', Overlay.hideSoon);
			},
			hideSoon() {
				clearTimeout(lastTimeout);
				lastTimeout = setTimeout(Overlay.hide, HOVER_HIDE_DELAY);
			},
			hide() {
				root.style.display = '';
			},
		};
	}
	return () => Overlay || create();
})();

const onMouseEnter = async(function*({ target: link, }) {
	(yield sleep(Prefs.prefs.showDelay));
	if (!link.matches(':hover')) { return; }

	const { title, origin, } = link.dataset;
	const preview = Previews[title] || (yield new Preview(title, origin));

	Overlay().show(preview, link);
	// link.wrappedJSObject.preview = unsafeWindow.JSON.parse(JSON.stringify(preview));
}, error => console.error(error.name, error.message, error.stack, error));

Array.filter(document.querySelectorAll('a'), link => {
	const  [ , origin, title, ] = (link.href.match(articleUrl) || [ ]);
	return title && title !== currentArticle && (link.dataset.title = title) && (window.location.origin === origin || (link.dataset.origin = origin));
}).forEach(element => element.addEventListener('mouseenter', onMouseEnter));

function sanatize(html) {
	return html.replace(/<(\/?)(\w+?)( title="[^"]*?")?>/g, (match, slash, tag, title) => (/^(p|b|br|i|ol|ul|li|big|sup|sub|tt|span|div)$/).test(tag) ? '<'+ slash + tag + (title || '') +'>' : '');
}

self.port.once('detach', Array.forEach(document.querySelectorAll('a'), element => element.removeEventListener('mouseenter', onMouseEnter)));

});
