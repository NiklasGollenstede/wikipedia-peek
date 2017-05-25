(function() { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'background/loader': { register, },
	'background/utils': { image, },
	module,
}) => {

// add: for urls like https://imgur.com/a/{page}

const options = (await register({
	name: module.id.split('/').pop(),
	title: `Images`,
	description: `Works on links to images and displays exactly that image.
	<br>Work in progress...`,

	priority: 0,
	includes: [ String.raw`^.*\.(?:jpeg|jpg|png|gif|svg)$`, ],

	async load(url) {
		return image({ src: url, description: url, });
	},
}));
void options;

}); })();
