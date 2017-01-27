(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { Tabs, webNavigation, },
	'node_modules/web-ext-utils/update/': _updated,
	'node_modules/web-ext-utils/utils/': { matchPatternToRegExp, },
}) => {

// ran updates and listens to content script script load requests

// the ports are only used by the content scripts to detect unloads
(global.browser || global.chrome).runtime.onConnect.addListener(() => void 0);

const scripts = [
	'/node_modules/es6lib/require.js',
	'/content/index.js',
];
const urls = [
	'*://*.wikipedia.org/*',
	'*://*.mediawiki.org/*',
	'*://*.wikia.com/*',
];

webNavigation.onCommitted.addListener(({ tabId, frameId, }) => {
	scripts.map(file => Tabs.executeScript(tabId, { frameId, file, }));
}, { url: urls.map(pattern => ({ urlMatches: matchPatternToRegExp(pattern).source, })), });

(await Tabs.query({ url: urls, })).forEach(({ id: tabId, }) => {
	scripts.map(file => Tabs.executeScript(tabId, { file, })); // this will only ever attach to top level frames
});

}); })(this);
