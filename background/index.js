'use strict'; // license: MPL-2.0

// the prots are only used by the content scripts to detect unloads
chrome.runtime.onConnect.addListener(port => void 0);

require('web-ext-utils/update')()
.then(() => require('web-ext-utils/utils').attachAllContentScripts({ cleanup: () => {
	typeof destroy === 'function' && destroy(); /* global destroy */
	delete window.require;
	delete window.define;
}, }));

// Firefox only: respond to the chrome.storage shim in context scripts
const { Messages, Storage, applications: { gecko, }, } = require('web-ext-utils/chrome');
gecko && Messages.addHandler('storage', (area, method, query) => {
	return query ? Storage.local[method](query) : Storage.local[method]();
});
