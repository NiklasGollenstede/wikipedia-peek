(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/functional': { noop, },
	'node_modules/web-ext-utils/browser/': { manifest, browserAction = noop, Tabs, Messages, runtime, },
	'node_modules/web-ext-utils/browser/version': { gecko, fennec, },
	'node_modules/web-ext-utils/loader/': { ContentScript, detachFormTab, getFrame, },
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
	Fallback, // loading this on demand is to slow in fennec
	Loader,
	require,
}) => {

let debug; options.debug.whenChange(([ value, ]) => { debug = value; require('node_modules/web-ext-utils/loader/').debug = debug >= 2; });
debug && console.info(manifest.name, 'loaded, updated', updated);

browserAction.setIcon({ path: manifest.icons, });

// Messages
Messages.addHandler(function getPreview() { return Loader.getPreview(this, ...arguments); }); // eslint-disable-line no-invalid-this
Messages.addHandler('reportError', reportError);
Messages.addHandlers('Fallback.', Fallback);


// ContentScript
const content = new ContentScript({
	modules: [ 'content/index', ],
});
const active = content.active = new WeakSet;
options.include.whenChange(values => {
	try { content.include = values; } catch (error) { reportError(`Invalid URL pattern`, error); throw error; }
});
options.include.children.exclude.whenChange(values => {
	try { content.exclude = values; } catch (error) { reportError(`Invalid URL pattern`, error); throw error; }
});
options.include.children.incognito.whenChange(([ value, ]) => {
	content.incognito = value;
});
options.debug.whenChange(updateConfig);
options.advanced.onAnyChange(updateConfig);
function updateConfig() { content.modules = { 'content/index': {
	debug: debug,
	touchMode: options.advanced.children.touchMode.value,
	excludeAnchor: {
		match: options.advanced.children.excludeAnchor.children.match.values.current,
		contain: options.advanced.children.excludeAnchor.children.contain.values.current,
	},
	showDelay: options.advanced.children.showDelay.value,
	fallback: options.advanced.children.fallback.value && {
		always: options.advanced.children.fallback.children.always.value,
	},
}, }; }

browserAction.onClicked.addListener(onClick);
async function onClick() { try {

	const tab = (await Tabs.query({ currentWindow: true, active: true, }))[0];
	if (active.has(getFrame(tab.id, 0))) {
		detachFormTab(tab.id, 0);
	} else {
		onMatch(...(await content.applyToFrame(tab.id, 0)));
	}

} catch (error) { reportError(error); throw error; } }

browserAction.setBadgeBackgroundColor({ color: [ 0x00, 0x7f, 0x00, 0x60, ], });

content.onMatch.addListener(onMatch); function onMatch(frame, url, done) {
	done.catch(reportError);
	active.add(frame);
	!frame.frameId && browserAction.setBadgeText({ tabId: frame.tabId, text: '✓', });
	!frame.frameId && browserAction.setTitle({ tabId: frame.tabId, title: 'Disable '+ manifest.name, });
	debug && console.debug('match frame', frame.tabId, frame.frameId, frame.incognito);
	frame.onRemove.addListener(frame => debug && console.debug('frame removed', frame));
}
content.onShow.addListener(frame => {
	active.add(frame);
	!frame.frameId && browserAction.setBadgeText({ tabId: frame.tabId, text: '✓', });
	!frame.frameId && browserAction.setTitle({ tabId: frame.tabId, title: 'Disable '+ manifest.name, });
	debug && console.debug('show frame (again)', frame);
});
content.onHide.addListener(frame => {
	active.delete(frame);
	!frame.frameId && (browserAction.setBadgeText({ tabId: frame.tabId, text: '', }) || noop).catch(_=>_); // can't catch in chrome
	!frame.frameId && (browserAction.setTitle({ tabId: frame.tabId, title: 'Enable '+ manifest.name, }) || noop).catch(_=>_); // can't catch in chrome
	debug && console.debug('hide frame', frame);
});

content.onHide.addListener(() => Fallback.hide());

(await content.applyNow());


// fixes
gecko && options.advanced.children.devicePixelRatio.whenChange(value => {
	global.devicePixelRatio = value; // the devicePixelRatio in the background page is always 1
});
fennec && debug && (await runtime.openOptionsPage());


// debugging
Object.assign(global, {
	options, content, onClick,
	Browser: require('node_modules/web-ext-utils/browser/'),
	Loader:  require('node_modules/web-ext-utils/loader/'),
	Utils:   require('node_modules/web-ext-utils/utils/'),
});

}); })(this);
