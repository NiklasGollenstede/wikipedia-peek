(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { notifications, Tabs, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	//	current: { component, from, to, now, },
	module,
}) => {

notifications.create(module.id, {
	[gecko ? 'type' : 'requireInteraction']: true,
	type:    'basic',
	title:   `Wikipedia Peek installed`,
	message: `Visit wikipedia.org or any wikia.com page to see it in action`,
	iconUrl: '/icon.png',
});

notifications.onClicked.addListener(onClicked);

async function onClicked(id) {
	if (id !== module.id) { return; }
	(await Tabs.create({ url: 'https://en.wikipedia.org/wiki/Main_Page', }));
}

global.setTimeout(() => {
	notifications.clear(module.id);
	notifications.onClicked.removeListener(onClicked);
}, 60e3);

}); })(this);
