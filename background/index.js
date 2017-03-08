(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/functional': { noop, },
	'node_modules/web-ext-utils/browser/': { BrowserAction = noop, browserAction = noop, pageAction = noop, Tabs, Messages, runtime, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/loader/': { ContentScript, detachFormTab, },
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/web-ext-utils/utils/': { reportError, showExtensionTab, },
	'common/options': options,
	Fallback, // loading this on demand is to slow in fennec
	Loader,
	require,
}) => {

let debug; options.debug.whenChange(value => (debug = value));
debug && console.info('Ran updates', updated);


// Messages
Messages.addHandler(function getPreview() { return Loader.getPreview(this, ...arguments); }); // eslint-disable-line no-invalid-this
Messages.addHandler('reportError', reportError);
Messages.addHandlers('Fallback.', Fallback);


// ContentScript
const content = new ContentScript({
	modules: [ 'content/index', ],
});
options.include.whenChange((_, { current, }) => {
	try { content.include = current; } catch (error) { reportError(`Invalid URL pattern`, error); throw error; }
});
options.include.children.exclude.whenChange((_, { current, }) => {
	try { content.exclude = current; } catch (error) { reportError(`Invalid URL pattern`, error); throw error; }
});
options.include.children.incognito.whenChange(value => {
	content.incognito = value;
});
options.debug.whenChange(value => (require('node_modules/web-ext-utils/loader/').debug = value));
options.debug.whenChange(updateConfig);
options.advanced.onAnyChange(updateConfig);
function updateConfig() { content.modules = { 'content/index': {
	debug: debug,
	fallback: options.advanced.children.fallback.value && {
		always: options.advanced.children.fallback.children.always.value,
	},
	touchMode: options.advanced.children.touchMode.value,
	showDelay: options.advanced.children.showDelay.value,
}, }; }

browserAction.onClicked.addListener(onClick);
async function onClick() { try {

	const tab = (await Tabs.query({ currentWindow: true, active: true, }))[0];
	const text = (await BrowserAction.getBadgeText({ tabId: tab.id, }));
	if (text) {
		detachFormTab(tab.id, 0);
	} else {
		onMatch(...(await content.applyToFrame(tab.id, 0)));
	}

} catch (error) { reportError(error); throw error; } }

pageAction.onClicked.addListener(openOptionsPage);
browserAction.setBadgeBackgroundColor({ color: [ 0x00, 0x7f, 0x00, 0x60, ], });

content.onMatch.addListener(onMatch); function onMatch(frame, url, done) {
	done.catch(reportError);
	!frame.frameId && pageAction.show(frame.tabId);
	!frame.frameId && browserAction.setBadgeText({ tabId: frame.tabId, text: '✓', });
	debug && console.debug('match frame', frame.tabId, frame.frameId, frame.incognito);
	frame.onRemove.addListener(frame => debug && console.debug('frame removed', frame));
}
content.onShow.addListener(frame => {
	!frame.frameId && browserAction.setBadgeText({ tabId: frame.tabId, text: '✓', });
	debug && console.debug('show frame (again)', frame);
});
content.onHide.addListener(frame => {
	!frame.frameId && browserAction.setBadgeText({ tabId: frame.tabId, text: '', });
	debug && console.debug('hide frame', frame);
});

(await content.applyNow());


// fixes
gecko && options.advanced.children.devicePixelRatio.whenChange(value => {
	global.devicePixelRatio = value; // the devicePixelRatio in the background page is always 1
});
function openOptionsPage() { showExtensionTab(new URL(runtime.getManifest().options_ui.page, new URL('/', location)).pathname); }


// debugging
Object.assign(global, {
	options, content, onClick, openOptionsPage,
	Browser: require('node_modules/web-ext-utils/browser/'),
	Loader:  require('node_modules/web-ext-utils/loader/'),
	Utils:   require('node_modules/web-ext-utils/utils/'),
});

}); })(this);
