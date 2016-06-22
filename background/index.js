'use strict'; // license: MPL-2.0

const { Tabs, } = window.Chrome = require('web-ext-utils/chrome');
const { matchPatternToRegExp, } = require('web-ext-utils/utils');

Tabs.query({ }).then(tabs => {
	console.log(tabs);
	chrome.runtime.getManifest().content_scripts.forEach(({ js, css, matches, exclude_matches, }) => {
		const includes = (matches|| [ ]).map(matchPatternToRegExp);
		const excludes = (exclude_matches|| [ ]).map(matchPatternToRegExp);
		Promise.all(tabs.map(({ id, url, }) => {
			if (!url || !includes.some(exp => exp.test(url)) || excludes.some(exp => exp.test(url))) { return; }
			return Tabs.executeScript(id, { code: 'delete window.require; delete window.define;', })
			.then(() => {
				css && css.forEach(file => chrome.tabs.insertCSS(id, { file, }));
				js && js.forEach(file => chrome.tabs.executeScript(id, { file, }));
				return true;
			})
			.catch(error => console.log('skipped tab', error)); // not allowed to execute
		})).then(success => console.log('attached to', success.filter(x=>x).length, 'tabs'));
	});
});

// the prots are only used by the content scripts to detect unloads
chrome.runtime.onConnect.addListener(port => void 0);


chrome.runtime.onInstalled.addListener(({ reason, previousVersion: prev, }) => {
	if (reason === 'install') { return onInstall(); }
	else if (reason === 'update') {
		if (prev, prev === chrome.runtime.getManifest().version) { return onReaload(); }
		return onUpdate(prev);
	}
});

function onInstall() {
	console.log('onInstall');
}

function onReaload() {
	console.log('onReaload');
}

function onUpdate(prev) {
	console.log('onUpdate', prev);
}
