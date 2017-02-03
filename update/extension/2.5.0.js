(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { notifications, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	//	current: { component, from, to, now, },
}) => {

notifications.create({
	[gecko ? 'type' : 'requireInteraction']: true,
	type: 'basic',
	title: `Update to 2.5.0`,
	message: `Wikipedia Peek was updated, it now works on *.wikia.com pages too!`,
	iconUrl: '/icon.png',
});

}); })(this);
