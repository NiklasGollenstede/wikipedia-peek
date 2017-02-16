(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/loader/content': { onUnload, },
	require,
	module,
}) => {

const { runtime, } = (global.browser || global.chrome);
const TOUCH_MODE_TIMEOUT = 500; // ms
const {
	touchMode = 'auto',
	showDelay = 500,
} = module.config() || { };
let currentTarget = null; // the link that is currently being processed
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

/**
 * Goes through all steps of loading a preview and checks if the link is still the target after each step.
 * @param  {Element}  link  The element that the user is currently targeting by hovering it or having tapped it.
 * @param  {boolean}  wait  Whether to wait showDelay before taking further steps.
 */
async function showForElement(link, wait) { try {

	currentTarget = link;
	wait && (await sleep(showDelay));
	if (currentTarget !== link) { return; }

	const getPreview = new Promise((resolve, reject) => runtime.sendMessage([ 'getPreview', 1, [ link.href, ], ], reply => { try {
		if (runtime.lastError) { return void reject(runtime.lastError); }
		const [ , id, [ value, ], ] = reply;
		(id < 0 ? reject : resolve)(value);
	} catch (error) { reject(error); } }));
	if (!overlay) { global.overlay = overlay = (await require.async('./overlay')); }
	if (currentTarget !== link) { return; }

	overlay.loading(link);
	const { content, } = (await getPreview);
	if (!content || currentTarget !== link) { overlay.cancel(link); return; }

	overlay.show(link, content);

} catch (error) {
	console.error(error);
	overlay && overlay.cancel(link);
} }

/**
 * Primary event listeners. Called when an applicable link is hovered or touched.
 */
function onMouseMove({ target: link, }) {
	if (!link.matches || !link.matches('a') || currentTarget === link || inTouchMode()) { return; }
	showForElement(link, true);
	link.addEventListener('mouseleave', function onMouseLeave(event) {
		if (event.target !== link) { return; }
		currentTarget = null; // cancel
		link.removeEventListener('mouseleave', onMouseLeave);
	});
}
function onTouchEnd(event) {
	if (
		   event.touches.length !== 0 || event.targetTouches.length !== 0
		|| event.changedTouches.length !== 1
		|| event.changedTouches.item(0).target !== event.target
	) { return; }
	const link = event.target.closest('a');
	if (link === currentTarget) { return; }
	if (!link) { currentTarget = null; overlay && overlay.hide(); return; }
	blockEvent(event);
	preventClick();
	showForElement(link, false);
}
function onMouseDown(event) {
	if (event.button) { return; }
	if (!inTouchMode()) { currentTarget = null; overlay && overlay.hide(); return; }
	const link = event.target.closest('a');
	if (link === currentTarget) { return; }
	if (!link) { currentTarget = null; overlay && overlay.hide(); return; }
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

function sleep(ms) { return new Promise(done => setTimeout(done, ms)); }
function blockEvent(event) {
	event.preventDefault();
	event.stopPropagation && event.stopPropagation();
}

}); })(this);
