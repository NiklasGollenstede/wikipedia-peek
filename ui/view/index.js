(function(global) { 'use strict';

const chrome = (global.browser || global.chrome);
chrome.windows.getCurrent(window => {
	global.windowId = window.id;
	const main = chrome.extension.getBackgroundPage();
	main.getViews[window.id](global);
	delete main.getViews[window.id];
});

})(this);
