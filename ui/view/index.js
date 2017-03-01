(function(global) { 'use strict';

const chrome = (global.browser || global.chrome);
chrome.tabs.getCurrent(tab => {
	global.tabId = tab.id;
	const main = chrome.extension.getBackgroundPage();
	main.getViews[tab.id](global);
	delete main.getViews[tab.id];
});

})(this);
