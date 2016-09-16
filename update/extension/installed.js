(() => { 'use strict'; define(function({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/chrome/': { notifications, applications: { gecko }, },
	'../synced/current': synced,
	current: { component, from, to, now, },
}) {

notifications.create({
	[gecko ? 'type' : 'requireInteraction']: true,
	type:    'basic',
	title:   `Wikipedia Peek installed`,
	message: `Visit wikipedia.org or any wikia.com page to see it in action`,
	iconUrl: '/icon.png',
});

}); })();