document.currentScript.return(function installed({ from, to, now, }) {
	const { applications: gecko, } = require('web-ext-utils/chrome');

	chrome.notifications.create({
		[gecko ? 'type' : 'requireInteraction']: true,
		type: 'basic',
		title: `Wikipedia Peek installed`,
		message: `Visit wikipedia.org or any wikia.com page to see it in action`,
		iconUrl: '/icon.png',
	});
});
