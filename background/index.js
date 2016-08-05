'use strict'; // license: MPL-2.0

// the prots are only used by the content scripts to detect unloads
chrome.runtime.onConnect.addListener(port => void 0);

require('web-ext-utils/update')()
// .then(updates => console.log('Ran updates', updates))
.then(() => require('web-ext-utils/utils').attachAllContentScripts({ cleanup: () => {
	typeof destroy === 'function' && destroy(); /* global destroy */
	delete window.require;
	delete window.define;
}, }));
