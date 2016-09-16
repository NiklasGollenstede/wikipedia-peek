(() => { 'use strict'; define(function*({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/web-ext-utils/chrome/': { runtime, Messages, Storage, applications: { gecko, }, },
	'node_modules/web-ext-utils/utils': { attachAllContentScripts, },
}) {
console.log('Ran updates', updated); // TODO: remove

// the ports are only used by the content scripts to detect unloads
runtime.onConnect.addListener(port => void 0);

// Firefox only: respond to the chrome.storage shim in context scripts
gecko && Messages.addHandler('storage', (area, method, query) => {
	return query ? Storage.local[method](query) : Storage.local[method]();
});

(yield attachAllContentScripts({ cleanup: () => {
	typeof destroy === 'function' && destroy(); /* global destroy */
	delete window.require;
	delete window.define;
}, }));

}); })();
