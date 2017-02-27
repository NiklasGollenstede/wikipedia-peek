(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/port': Port,
	'node_modules/web-ext-utils/browser/': { browserAction, Tabs, Messages, runtime, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/loader/': { ContentScript, },
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
	Loader,
	require,
}) => {

updated.extension.to.channel !== '' && console.info('Ran updates', updated);


// Loader
Messages.addHandler(function getPreview() { return Loader.getPreview(this, ...arguments); }); // eslint-disable-line no-invalid-this


// ContentScript
const content = new ContentScript({
	runAt: 'document_end',
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

browserAction && browserAction.onClicked.addListener(onClick);
async function onClick() { try {

	const tab = (await Tabs.query({ currentWindow: true, active: true, }))[0];
	(await content.applyToFrame(tab.id, 0));

} catch (error) { reportError(error); throw error; } }

(await content.applyNow());


// CSP fallback
runtime.onConnect.addListener(async _port => {
	if (_port.name === 'require.scriptLoader') { return; }
	const port = new Port(_port, Port.web_ext_Port);
	port.tabId = _port.sender.tab && _port.sender.tab.id;
	switch (_port.name) {
		case 'overlay-fallback': {
			const Fallback = (await require.async('./fallback'));
			Fallback.add(port);
		} break;
		default: throw new Error(`Bad connect "${ _port.name }"`);
	}
});


// fixes
gecko && options.advanced.children.devicePixelRatio.whenChange(value => {
	global.devicePixelRatio = value; // the devicePixelRatio in the background page is always 1
});

// debugging
Object.assign(global, {
	options, content, onClick,
	Browser: arguments[0]['node_modules/web-ext-utils/browser/'],
	Loader:  arguments[0]['node_modules/web-ext-utils/loader/'],
	Utils:   arguments[0]['node_modules/web-ext-utils/utils/'],
});

}); })(this);
