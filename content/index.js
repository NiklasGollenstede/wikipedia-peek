(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/loader/content': { onUnload, },
	require,
	module,
}) => {

const { runtime, } = (global.browser || global.chrome);
const TOUCH_MODE_TIMEOUT = 300; // ms
const {
	touchMode = 'auto',
	showDelay = 500,
} = module.config() || { }; // TODO: actually set these
let loading = null; // the link that is currently being loaded for
let overlay = null; /* require.async('./overlay') */


/// returns whether or not the screen has recently been touched and touch friendly behavior should apply
const inTouchMode = typeof touchMode === 'boolean' ? () => touchMode
: (() => {
	let lastTouch = 0; const touchEvents = [ 'touchstart', 'touchmove', 'touchend', ];
	touchEvents.forEach(type => document.body.addEventListener(type, onTouch));
	onUnload.addListener(() => touchEvents.forEach(type => document.body.removeEventListener(type, onTouch)));
	function onTouch() { lastTouch = Date.now(); }
	return () => lastTouch && Date.now() - lastTouch < TOUCH_MODE_TIMEOUT;
})();

/// prevents the click event that would follow a mousedown event
const preventClick = (timeout => () => {
	clearTimeout(timeout);
	document.addEventListener('click', blockEvent);
	timeout = setTimeout(() => {
		document.removeEventListener('click', blockEvent);
	}, TOUCH_MODE_TIMEOUT);
})(0);

const request = (method, ...args) => new Promise((resolve, reject) => runtime.sendMessage([ method, 1, args, ], reply => { try {
	if (runtime.lastError) { return void reject(runtime.lastError); }
	const [ , id, [ value, ], ] = reply;
	(id < 0 ? reject : resolve)(value);
} catch (error) { reject(error); } }));

/**
 * Goes through all steps of loading a preview and checks if the link is still the target after each step.
 * @param  {Element}  link  The element that the user is currently targeting by hovering it or having tapped it.
 * @param  {boolean}  wait  Whether to wait showDelay before taking further steps.
 */
async function showForElement(link, wait) {
	if (loading === link || overlay && overlay.target === link && overlay.state !== 'hidden') { return; }
	if (equalExceptHash(link.href, location.href)) { return; } // TODO: ignore data:, blob: javascript:, ...
	loading = link; let canceled = false; const cancel = () => {
		loading = null; canceled = true;
		overlay && overlay.cancel(link);
		link.removeEventListener('mouseleave', cancel);
		document.removeEventListener('click', cancel);
	};
	try {
		link.addEventListener('mouseleave', cancel);
		document.addEventListener('click', cancel);

		// on hover, wait a bit
		wait && (await sleep(showDelay));
		if (canceled) { return; }

		// start loading
		const getPreview = request('getPreview', link.href);
		let gotPreview = false; getPreview.then(() => (gotPreview = true));

		// show loading animation
		if (!overlay) { global.overlay = overlay = (await require.async('./overlay')); }
		else { (await sleep(100)); } // give the cache a bit of time to respond before showing the spinner
		if (canceled) { return; }
		if (!gotPreview) {
			(await overlay.loading(link));
			if (canceled) { return; }
		}

		const content = (await getPreview);
		if (canceled) { return; }

		loading = null;
		if (!content) { overlay.cancel(link); return; }
		(await overlay.show(link, content));

	} catch (error) {
		console.error(error);
		overlay && overlay.cancel(link);
	} finally {
		link.removeEventListener('mouseleave', cancel);
		document.removeEventListener('click', cancel);
	}
}

/**
 * Primary event listeners. Called when an applicable link is hovered or touched.
 */
let lastHover; function onMouseMove({ target: link, }) {
	if (inTouchMode()) { return; }
	if (!link.closest) { link = link.parentNode; } // for text nodes
	link = link.closest('a');
	if (!link) { lastHover = null; return; }
	if (lastHover === link) { return; }
	lastHover = link;
	showForElement(link, true);
}
function onTouchEnd(event) {
	if (
		   event.touches.length !== 0 || event.targetTouches.length !== 0
		|| event.changedTouches.length !== 1
		|| event.changedTouches.item(0).target !== event.target
	) { return; }
	const link = event.target.closest('a'); if (!link) { return; }
	blockEvent(event);
	preventClick();
	showForElement(link, false);
}
function onMouseDown(event) {
	if (event.button || !inTouchMode()) { return; }
	const link = event.target.closest('a'); if (!link) { return; }
	preventClick();
	showForElement(link, false);
}

{
	document.addEventListener('mousemove', onMouseMove);
	document.addEventListener('touchend', onTouchEnd);
	document.addEventListener('mousedown', onMouseDown);
}
onUnload.addListener(() => {
	document.removeEventListener('mousemove', onMouseMove);
	document.removeEventListener('touchend', onTouchEnd);
	document.removeEventListener('mousedown', onMouseDown);
});

return;

function equalExceptHash(a, b) {
	const ia = a.indexOf('#');
	const ib = b.indexOf('#');
	if (ia !== ib && !(
		   ia < 0 && ib >= 0 && a.length === ib
		|| ib < 0 && ia >= 0 && b.length === ia
	)) { return false; }
	return (ia < 0 ? a : a.slice(0, ia)) === (ib < 0 ? b : b.slice(0, ib));
}

function sleep(ms) { return new Promise(done => setTimeout(done, ms)); }
function blockEvent(event) {
	event.preventDefault();
	event.stopPropagation && event.stopPropagation();
}

}); })(this);
