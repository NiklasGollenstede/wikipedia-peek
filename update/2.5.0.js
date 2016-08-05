document.currentScript.return(function v2_5_0({ from, to, now, synced, }) {
	const { applications: gecko, } = require('web-ext-utils/chrome');

	chrome.notifications.create({
		[gecko ? 'type' : 'requireInteraction']: true,
		type: 'basic',
		title: `Update to ${ now }`,
		message: `Wikipedia Peek was updated, it now works on *.wikia.com pages too!`,
		iconUrl: '/icon.png',
	});
});
