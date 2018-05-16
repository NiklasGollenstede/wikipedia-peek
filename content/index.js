(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/loader/content': { onUnload, },
	require,
	module,
}) => { /* global window, document, location, setTimeout, clearTimeout, */

const chrome = (global.browser || global.chrome);
const TOUCH_MODE_TIMEOUT = 300; // ms
const {
	debug = 0,
	touchMode = 'auto',
	excludeAnchor: {
		match: doNotMatch = [ ],
		contain: doNotContain = [ ],
	} = { },
	showDelay = 500,
	fallback = true,
} = module.config() || { };
let loading = null; // the link that is currently being loaded for
let overlay = null; /* require.async('./overlay') */

debug && console.info('content options', module.config());

/// returns whether or not the screen has recently been touched and touch friendly behavior should apply
const inTouchMode = typeof touchMode === 'boolean' ? () => touchMode
: (() => {
	let lastTouch = 0; const touchEvents = [ 'touchstart', 'touchmove', 'touchend', ];
	touchEvents.forEach(type => window.addEventListener(type, onTouch, true));
	onUnload.addListener(() => touchEvents.forEach(type => window.removeEventListener(type, onTouch, true)));
	function onTouch() { lastTouch = Date.now(); } // TODO: use event.timestamp
	return () => lastTouch && Date.now() - lastTouch < TOUCH_MODE_TIMEOUT;
})();

/// prevents the click event that would follow a mousedown event
const preventClick = (timeout => () => {
	clearTimeout(timeout);
	window.addEventListener('click', blockEvent, true);
	timeout = setTimeout(() => {
		window.removeEventListener('click', blockEvent, true);
	}, TOUCH_MODE_TIMEOUT);
})(0);

/**
 * Goes through all steps of loading a preview and checks if the link is still the target after each step.
 * @param  {Element}  link  The element that the user is currently targeting by hovering it or having tapped it.
 * @param  {boolean}  wait  Whether to wait showDelay before taking further steps.
 */
async function showForElement(link, active) {
	loading = link; let canceled = false; const cancel = _ => {
		debug && console.info('cancel for', _, link);
		loading = null; canceled = true;
		overlay && overlay.cancel(link);
		link.removeEventListener('mouseleave', cancel);
		document.removeEventListener('click', cancel);
	};
	try {
		link.addEventListener('mouseleave', cancel);
		document.addEventListener('click', cancel);

		// on hover, wait a bit
		!active && (await sleep(showDelay));
		if (canceled) { return; }

		debug && console.info('loading for', link);
		// start loading
		const getPreview = request('getPreview', link.href);
		let gotPreview = false; getPreview.then(() => (gotPreview = true));

		// show loading animation
		if (!overlay) { global.overlay = overlay = (await (
			fallback.always ? require.async('./fallback')
			: require.async('./overlay').then(_=>_ || fallback && require.async('./fallback'))
		)); }
		else { (await sleep(100)); } // give the cache a bit of time to respond before showing the spinner
		if (!overlay) { doUnload(); throw new Error(`Unable to open preview (fallback is disabled)`); }
		if (canceled) { return; }
		if (!gotPreview) {
			(await overlay.loading(link));
			if (canceled) { return; }
		}

		const content = (await getPreview);
		if (canceled) { return; }

		loading = null;
		if (!content) { overlay.failed(link, active); return; }
		(await overlay.show(link, content));

	} catch (error) {
		console.error(error);
		overlay && overlay.failed(link, active);
		request('reportError', `Failed to show preview`, (error && error.message));
	} finally {
		link.removeEventListener('mouseleave', cancel);
		document.removeEventListener('click', cancel);
	}
}

function shouldIgnore(link) { return (
	!link || loading === link || !link.href
	|| overlay && overlay.target === link && overlay.state !== 'hidden'
	|| (/^(?:about|blob|data|javascript|mailto):/).test(link.href)
	|| equalExceptHash(link.href, location.href)
	|| excludeAnchor(link)
); }

function excludeAnchor(link) {
	for (const selector of doNotMatch) {
		try { if (link.matches(selector)) { return true; } } catch (_) { }
	}
	for (const selector of doNotContain) {
		try { if (link.querySelector(selector)) { return true; } } catch (_) { }
	}
	return false;
}

/**
 * Primary event listeners. Called when an applicable link is hovered or touched.
 */
let lastHover; function onMouseMove({ target: link, }) {
	if (inTouchMode()) { return; }
	if (!link.closest) { link = link.parentNode; } // for text nodes
	link = link && link.closest('a');
	if (!link) { lastHover = null; return; }
	if (lastHover === link) { return; }
	lastHover = link;
	if (shouldIgnore(link)) { return; }
	showForElement(link, false);
}
function onTouchEnd(event) {
	if (
		   event.touches.length !== 0 || event.targetTouches.length !== 0
		|| event.changedTouches.length !== 1
		|| event.changedTouches.item(0).target !== event.target
	) { return; }
	const link = event.target.closest('a'); if (shouldIgnore(link)) { return; }
	blockEvent(event);
	preventClick();
	showForElement(link, true);
}
function onMouseDown(event) {
	if (event.button || !inTouchMode()) { return; }
	const link = event.target.closest('a'); if (shouldIgnore(link)) { return; }
	preventClick();
	showForElement(link, true);
}

{
	document.addEventListener('mousemove', onMouseMove, true);
	document.addEventListener('touchend', onTouchEnd, true);
	document.addEventListener('mousedown', onMouseDown, true);
}
onUnload.addListener(doUnload);
function doUnload() {
	document.removeEventListener('mousemove', onMouseMove, true);
	document.removeEventListener('touchend', onTouchEnd, true);
	document.removeEventListener('mousedown', onMouseDown, true);
}

return {
	request,
	sleep,
};

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

function request(method, ...args) { return new Promise((resolve, reject) => chrome.runtime.sendMessage([ method, 1, args, ], reply => { try {
	if (chrome.runtime.lastError) { return void reject(chrome.runtime.lastError); }
	const [ , id, [ value, ], ] = reply;
	(id < 0 ? reject : resolve)(value);
} catch (error) { reject(error); } })); }

}); })(this);
