(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/loader/content': { onUnload, },
	'common/options': options,
	'common/sandbox': Sandbox,
	'fetch!./panel.css:css': css,
	'fetch!./panel.html': html,
	'./panel.js': js,
	'./': { request, sleep, },
	require,
}) => { /* global document, setTimeout, */

const HOVER_HIDE_DELAY = 230; // ms
const style = options.style.children;
let target = null, state = 'hidden';
const port = (await new Sandbox(js, {
	html: html.replace(/\${\s*css\s*}/, css),
	srcUrl: require.toUrl('./panel.js'),
	host: document.scrollingElement,
}).catch(error => console.error(error)));
if (!port) { return false; } // can't return null
const frame = port.frame;

function setSize({ scrollWidth: width, height, }) {
	frame.style.width  = width  +'px';
	frame.style.height = height +'px';
	const position = frame.getBoundingClientRect();
	const host = getHostPosition();
	if (position.width > host.width) {
		frame.style.left = host.width/2 +'px';
	} else if (position.left < host.left + 10) {
		frame.style.left = 10 + position.width/2 +'px';
	} else if (position.right > host.right - 10) {
		frame.style.left = host.width - 10 - position.width/2 +'px';
	}
}

function getStyle() { return (
	style.showFail.value === 'auto' ? '' : '#fail-cross { visibility: '+ (style.showFail.value ? 'visible' : 'hidden') +' !important; }'
) +`
#content::before, #border::after /* background, border */
{ opacity: ${ (1 - style.transparency.value / 100) }; }
#content::before /* background */
{ background-color: ${ style.backgroundColor.value }; }
#content::after /* border */
{ border-color: ${ style.color.value }; }
#content {
	color: ${ style.color.value };
	font-family: ${ style.fontFamily.value };
	font-size: ${ style.fontSize.value }%;
}`; }

function getHostPosition() {
	return document.scrollingElement === document.body
	&& global.getComputedStyle(document.scrollingElement).position === 'static'
	? document.documentElement.getBoundingClientRect()
	: document.scrollingElement.getBoundingClientRect();
}

const listener = {
	checking: false,
	async handleEvent(event) {
		if (event.type === 'click') { return void Overlay.hide(); }
		// else mousemove
		if (listener.checking || target.contains(event.target) || event.target === frame) { return; }
		listener.checking = true; try { for (let i = 0; i < 8; ++i) {
			(await sleep(HOVER_HIDE_DELAY / 8));
			// moving the cursor over a window on top of the page doesn't remove :hover in chrome
			if (!target || target.matches(':hover') || frame.matches(':hover')) { return; }
		} } finally { listener.checking = false; }
		listener.detatch();
		Overlay.hide();
	},
	attach() {
		setTimeout(() => document.addEventListener('click', listener), 500);
		document.addEventListener('mousemove', listener);
	},
	detatch() {
		document.removeEventListener('click', listener);
		document.removeEventListener('mousemove', listener);
	},
};

async function setState(newState, newTarget, arg) {
	if (newState === state && target === newTarget) { return; }
	state = newState; target = newTarget;

	frame.style.pointerEvents = state === 'showing' ? '' : 'none';
	frame.style.display = state === 'hidden' ? 'none' : '';
	frame.style.width = frame.style.height = '0';
	state === 'showing' || state === 'failed' ? listener.attach() : listener.detatch();

	const size = (await port.request('setState', state, arg));
	if (state === 'hidden') { frame.style.top = frame.style.left = '0'; return; }

	const position = target && target.getBoundingClientRect(), host = getHostPosition();
	frame.style.top   = (-host.top  + position.bottom + (state === 'showing' ? 5 : -position.height/2 - size.height/2)) +'px';
	frame.style.left  = (-host.left + position.left   + position.width/2) +'px';
	setSize(size);
}

const Overlay = {
	get target() { return target; },
	get state() { return state; }, // one of [ hidden, loading, failed, showing, ]
	async loading(element) {
		return void (await setState('loading', element, null));
	},
	async failed(element, visible) {
		return void (await setState('failed', element, visible));
	},
	async show(element, content) {
		return void (await setState('showing', element, { content, maxWidth: Math.min(document.documentElement.clientWidth, window.screen.width) - 20, }));
	},
	async cancel(element) {
		if (state !== 'loading' || !element || element !== target) { return; }
		return void (await setState('hidden', null, null));
	},
	async hide() {
		return void (await setState('hidden', null, null));
	},
};

{
	frame.style.position = 'absolute';
	frame.style.border = 'none';
	frame.style.backgroundColor = 'transparent';
	frame.style.transform = 'translateX(-50%)'; // change '.left' to actually mean '.center'
	frame.style.zIndex = '2147483647'; // max
}

port.addHandler(setSize);
port.addHandler((/^background\./), (name, ...args) => request(name.replace('background', 'panel'), ...args));
async function setStyle() { setSize((await port.request('setStyle', getStyle()))); }
style.parent.onAnyChange(setStyle); setStyle();
onUnload.addListener(() => Overlay.hide() === frame.remove());

return Overlay;

}); })(this);
