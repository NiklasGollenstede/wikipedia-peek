(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { notifications, },
	//	current: { component, from, to, now, },
}) => {

notifications.create({
	type: 'basic',
	title: `Incompatible Browser`,
	message: `Unfortunately, Wikipedia Peek is not compatible with Firefox 52+ yet, but it will work again in future versions of Firefox (54 maybe?). Just keep it installed. I am sorry for any inconvenience!`,
	iconUrl: '/icon.png',
});

}); })(this);
