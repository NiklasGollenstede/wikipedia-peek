(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'./': { request, sleep, },
}) => {

const HOVER_HIDE_DELAY = 230; // ms
let target = null, state = 'hidden';

let checking = false; async function onHover(event) {
	if (checking || target.contains(event.target)) { return; }
	checking = true; try { for (let i = 0; i < 10; ++i) {
		(await sleep(HOVER_HIDE_DELAY / 8));
		if (!target || target.matches(':hover') || !document.body.matches(':hover')) { return; }
	} } finally { checking = false; }
	if ((await request('Fallback.isHovered'))) { return; } // moving the cursor over a window on top of the page doesn't remove :hover in chrome, so do one final test
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
	async failed(element) {
		if (target === element && state !== 'hidden') { return; }
		target = element; state = 'failed';
		// no-op
	},
	async show(element, preview) {
		if (target === element && state === 'showing') { return; }
		target = element; state = 'showing';
		const position = element.getBoundingClientRect();
		document.addEventListener('mousemove', onHover);
		(await request('Fallback.show', preview, {
			top:   position.bottom * devicePixelRatio,
			left:  position.left   * devicePixelRatio,
			width: position.width  * devicePixelRatio,
		}));
		state = 'hidden';
	},
	cancel(_) {
		// no-op
	},
	hide() {
		if (state === 'hidden') { return; } state = 'hidden';
		document.removeEventListener('mousemove', onHover);
		request('Fallback.hide');
	},
};

return Overlay;

}); })(this);
