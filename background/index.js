(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { Tabs, webNavigation, },
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/web-ext-utils/utils/': { attachAllContentScripts, matchPatternToRegExp, },
}) => {

// ran updates and listens to content script script load requests
updated.extension.to.channel !== '' && console.info('Ran updates', updated); // eslint-disable-line no-console

// the ports are only used by the content scripts to detect unloads
(global.browser || global.chrome).runtime.onConnect.addListener(() => void 0);

Tabs && (await attachAllContentScripts({ cleanup: () => {
	typeof destroy === 'function' && destroy(); /* global destroy */
	delete window.require;
	delete window.define;
}, }));

// once fennec supports tabs (in version 54!!), the content_scripts and the above attachAllContentScripts can be removed in favor of some variation of the potentially more dynamic approach below
return; /* eslint-disable no-unreachable */

const scripts = [
	'/node_modules/es6lib/require.js',
	'/content/index.js',
];
const urls = [
	'*://*.wikipedia.org/*',
	'*://*.mediawiki.org/*',
	'*://*.wikia.com/*',
];
const runAt = 'document_start';

webNavigation.onDOMContentLoaded.addListener(({ tabId, frameId, }) => {
	scripts.map(file => Tabs.executeScript(tabId, { frameId, file, runAt, }));
}, { url: urls.map(pattern => ({ urlMatches: matchPatternToRegExp(pattern).source, })), });

(await Tabs.query({ url: urls, })).forEach(({ id: tabId, }) => {
	scripts.map(file => Tabs.executeScript(tabId, { file, runAt, })); // this will only ever attach to top level frames
});

}); })(this);
