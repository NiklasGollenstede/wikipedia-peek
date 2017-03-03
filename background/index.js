(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/port': Port,
	'node_modules/web-ext-utils/browser/': { browserAction, pageAction, Tabs, Messages, runtime, },
	'node_modules/web-ext-utils/browser/version': { gecko, fennec, },
	'node_modules/web-ext-utils/loader/': { ContentScript, },
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/web-ext-utils/utils/': { reportError, showExtensionTab, },
	'common/options': options,
	Fallback, // loading this on demand is to slow in fennec
	Loader,
	require,
}) => {

options.debug.value && console.info('Ran updates', updated);


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
options.advanced.children.fallback.whenChange(updateConfig);
options.advanced.children.fallback.children.always.whenChange(updateConfig);
options.advanced.children.touchMode.whenChange(updateConfig);
options.advanced.children.showDelay.whenChange(updateConfig);
function updateConfig() { content.modules = { 'content/index': {
	debug: options.debug.value,
	fallback: options.advanced.children.fallback.value && {
		always: options.advanced.children.fallback.children.always.value,
	},
	touchMode: options.advanced.children.touchMode.value,
	showDelay: options.advanced.children.showDelay.value,
}, }; }

browserAction && browserAction.onClicked.addListener(onClick);
async function onClick() { try {

	const tab = (await Tabs.query({ currentWindow: true, active: true, }))[0];
	(await content.applyToFrame(tab.id, 0));

} catch (error) { reportError(error); throw error; } }

fennec && pageAction && content.onMatch.addListener(({ tabId, }) => pageAction.show(tabId));
fennec && pageAction && pageAction.onClicked.addListener(openOptionsPage);

content.onMatch.addListener(({
	tabId, frameId, incognito,
	onPageHide, onPageShow, onRemove,
}) => {
	if (!options.debug.value) { return; }
	console.debug('match frame', tabId, frameId, incognito);
	onPageHide.addListener(() => console.debug('hide frame', tabId, frameId));
	onPageShow.addListener(() => console.debug('show frame (again)', tabId, frameId));
	onRemove.addListener(() => console.debug('frame removed', tabId, frameId));
});

(await content.applyNow());


// CSP fallback
runtime.onConnect.addListener(async _port => {
	if (_port.name === 'require.scriptLoader') { return; }
	const port = new Port(_port, Port.web_ext_Port);
	port.tabId = _port.sender.tab && _port.sender.tab.id;
	switch (_port.name) {
		case 'overlay-fallback': {
			Fallback.add(port);
		} break;
		default: throw new Error(`Bad connect "${ _port.name }"`);
	}
});


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
