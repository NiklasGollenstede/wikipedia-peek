(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/port': Port,
	'node_modules/web-ext-utils/loader/content': { onUnload, },
	'common/options': options,
	'common/sandbox': makeSandbox,
	'./panel.html': html,
	'./panel.css': css,
	'./panel.js': js,
	require,
}) => {

const SPINNER_SIZE = (/SPINNER_SIZE\ ?\*\/\ ?(\d+)px/).exec(css)[1];
const HOVER_HIDE_DELAY = 230; // ms
const style = options.style.children;
let target = null, state = 'hidden';
const port = (await makeSandbox(js, {
	html, srcUrl: require.toUrl('./panel.js'),
	host: document.scrollingElement,
}).catch(error => console.error(error)));
if (!port) { return doFallback(); }
const frame = port.frame;

function setSize({ width, height, }) {
	frame.style.width  = (+width)  +'px';
	frame.style.height = (+height) +'px';
	const position = frame.getBoundingClientRect();
	if (position.left < 10) {
		frame.style.left = (width / 2 + 10) +'px';
	} else if (position.right > document.scrollingElement.clientWidth - 10) {
		frame.style.left = (document.scrollingElement.clientWidth - width / 2 - 10) +'px';
	}
}

function getStyle() { return {
	color: style.color.value,
	fontFamily: style.fontFamily.value,
	fontSize: style.fontSize.value,
	backgroundColor: style.backgroundColor.value,
	transparency: style.transparency.value,
}; }

const handlers = {
	click(event) {
		Overlay.hide();
	},
	checking: false,
	async mousemove(event) {
		if (handlers.checking || Overlay.target.contains(event.target) || event.target === frame) { return; }
		handlers.checking = true; try { for (let i = 0; i < 8; ++i) {
			(await sleep(HOVER_HIDE_DELAY / 8));
			// moving the cursor over a window on top of the page doesn't remove :hover in chrome
			if (!Overlay.target || Overlay.target.matches(':hover') || frame.matches(':hover')) { return; }
		} } finally { handlers.checking = false; }
		handlers.detatch();
		Overlay.hide();
	},
	attach() {
		setTimeout(() => document.addEventListener('click', handlers.click), 500);
		document.addEventListener('mousemove', handlers.mousemove);
	},
	detatch() {
		document.removeEventListener('click', handlers.click);
		document.removeEventListener('mousemove', handlers.mousemove);
	},
};

const Overlay = {
	get target() { return target; },
	get state() { return state; }, // one of [ hidden, loading, showing, ]
	async loading(element) {
		if (target === element && state !== 'hidden') { return; }
		target = element; state = 'loading';
		const position = element.getBoundingClientRect();
		frame.style.top  = (window.scrollY + position.top  + position.height / 2 - SPINNER_SIZE / 2) +'px';
		frame.style.left = (window.scrollX + position.left + position.width  / 2) +'px';
		frame.style.pointerEvents = 'none';
		frame.style.display = '';

		frame.style.width = frame.style.height = '0';
		const size = (await port.request('loading'));
		setSize(size);
	},
	async show(element, preview) {
		if (target === element && state === 'showing') { return; }
		target = element; state = 'showing';
		element.title && (element.titleAttr = element.title) && (element.title = '');
		const position = element.getBoundingClientRect();
		frame.style.top  = (position.bottom + window.scrollY + 5) +'px';
		frame.style.left = (position.left   + window.scrollX + position.width / 2) +'px';
		frame.style.pointerEvents = '';
		frame.style.display = '';

		frame.style.width = frame.style.height = '0';
		const size = (await port.request('show', preview, document.documentElement.clientWidth - 20));
		setSize(size);
		handlers.attach();
	},
	cancel(element) {
		if (state !== 'loading' || !element || element !== target) { return; }
		Overlay.hide();
	},
	hide() {
		if (state === 'hidden') { return; } state = 'hidden';
		frame.style.display = 'none';
		target.titleAttr && (target.title = target.titleAttr);
		delete target.titleAttr;
		port.post('hide');
		handlers.detatch();
	},
};

{
	frame.style.position = 'absolute';
	frame.style.border = 'none';
	frame.style.transform = 'translateX(-50%)'; // change '.left' to actually mean '.center'
	frame.style.zIndex = '2147483647'; // max
}

port.addHandler(setSize);
async function setStyle() { setSize((await port.request('setStyle', getStyle()))); }
style.parent.onAnyChange(setStyle); setStyle();
onUnload.addListener(() => Overlay.hide() === frame.remove());

return Overlay;

function sleep(ms) { return new Promise(done => setTimeout(done, ms)); }

async function doFallback() { // if the inline frame fails to load due to the pages CSP, this lets the background open popup windows instead

	const port = new Port((global.browser || global.chrome).runtime.connect({ name: 'overlay-fallback', }), Port.web_ext_Port);

	port.addHandler(function hide() {
		state = 'hidden'; target = null;
		document.removeEventListener('mousemove', onHover);
	});

	let checking = false; async function onHover(event) {
		if (checking || Overlay.target.contains(event.target)) { return; }
		checking = true; try { for (let i = 0; i < 10; ++i) {
			(await sleep(HOVER_HIDE_DELAY / 8));
			// moving the cursor over a window on top of the page doesn't remove :hover in chrome
			if (!Overlay.target || Overlay.target.matches(':hover') || !document.body.matches(':hover')) { return; }
		} } finally { checking = false; }
		document.removeEventListener('mousemove', onHover);
		Overlay.hide();
	}

	const Overlay = {
		get target() { return target; },
		get state() { return state; }, // one of [ hidden, loading, showing, ]
		async loading(element) {
			if (target === element && state !== 'hidden') { return; }
			target = element; state = 'loading';
			// no-op
		},
		async show(element, preview) {
			if (target === element && state === 'showing') { return; }
			target = element; state = 'showing';
			const position = element.getBoundingClientRect();
			port.post('show', preview, {
				top:   position.bottom * devicePixelRatio,
				left:  position.left   * devicePixelRatio,
				width: position.width  * devicePixelRatio,
			}, getStyle());
			document.addEventListener('mousemove', onHover);
		},
		cancel(_) {
			// no-op
		},
		hide() {
			if (state === 'hidden') { return; } state = 'hidden';
			port.post('hide');
			document.removeEventListener('mousemove', onHover);
		},
	};

	return Overlay;
}

}); })(this);
