(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/loader/content': { onUnload, },
	'common/options': options,
	'common/sandbox': makeSandbox,
	'./panel.html': html,
	'./panel.css': css,
	'./panel.js': js,
	require,
}) => {

const SPINNER_SIZE = (/SPINNER_SIZE\ ?\*\/\ ?(\d+)px/).exec(css)[1];
const HOVER_HIDE_DELAY = 800; // ms
const style = options.style.children;
const port = (await makeSandbox(js, { html, srcUrl: require.toUrl('./panel.js'), host: document.scrollingElement, }));
const frame = port.frame;
let currentElement = null;

const handlers = {
	click(event) {
		methods.hide();
	},
	async mousemove(event) {
		if (currentElement.contains(event.target) || event.target === frame) { return; }
		(await sleep(HOVER_HIDE_DELAY));
		if (currentElement.matches(':hover') || frame.matches(':hover')) { return; }
		frame.style.display !== 'none' && methods.hide();
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

const methods = {
	loading(element) {
		currentElement = element;
		frame.style.display = '';
		const position = element.getBoundingClientRect();
		frame.style.top = window.scrollY + position.top + position.height / 2 - SPINNER_SIZE / 2 +'px';
		frame.style.left = window.scrollX + position.left + position.width / 2 +'px';
		frame.style.height = frame.style.width = SPINNER_SIZE +'px';
		frame.style.pointerEvents = 'none';
		port.post('loading');
	},
	cancel(element) {
		if (!element || element !== currentElement) { return; }
		methods.hide();
	},
	show(element, preview) {
		currentElement = element;
		element.title && (element.titleAttr = element.title); element.title = '';
		frame.style.display = '';
		const position = element.getBoundingClientRect();
		frame.style.top = (position.bottom + window.scrollY + 10) +'px';
		frame.style.left = (position.left + window.scrollX + position.width / 2) +'px';
		frame.style.transform = 'translateX(-50%)';

		frame.style.pointerEvents = '';
		port.post('show', preview, document.documentElement.clientWidth - 20);
		handlers.attach();
	},
	hide() {
		frame.style.display = 'none';
		currentElement.titleAttr && (currentElement.title = currentElement.titleAttr);
		delete currentElement.titleAttr;
		port.post('hide');
		handlers.detatch();
	},
};

{
	frame.style.display = 'none';
	frame.style.position = 'absolute';
	frame.style.border = 'none';
	frame.style.zIndex = '2147483647'; // max
}

port.addHandler(function setSize(width, height) {
	frame.style.width  = (+width)  +'px';
	frame.style.height = (+height) +'px';
	const position = frame.getBoundingClientRect();
	if (position.left < 10) {
		frame.style.left = (width / 2 + 10) +'px';
	} else if (position.right > document.scrollingElement.clientWidth - 10) {
		frame.style.left = (document.scrollingElement.clientWidth - width / 2 - 10) +'px';
	}
});

onUnload.addListener(() => methods.hide() === frame.remove());
style.parent.onAnyChange(setStyle); setStyle();
function setStyle() { port.post('setStyle', {
	color: style.color.value, // 'red',
	fontFamily: style.fontFamily.value, // 'fantasy',
	fontSize: style.fontSize.value, // 200,
	backgroundColor: style.backgroundColor.value, // 'blue',
	transparency: style.transparency.value, // 50,
}); }

return methods;

function sleep(ms) { return new Promise(done => setTimeout(done, ms)); }

}); })(this);
