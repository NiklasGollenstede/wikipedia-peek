(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	'background/utils': { image, },
	module,
}) => {

const Self = {
	name: module.id.split('/').pop(),
	title: `xkcd.com`,
	description: `Loads xkcd comic images.`,

	priority: 1,
	includes: [ String.raw`^https?://xkcd\.com/\d+/$`, ],

	async load(url) {
		url = url.replace(/^https?:/, 'https:');

		const { response, } = (await HttpRequest({ url, responseType: 'text', }));

		let img = (/id="comic">\s*(<img.*?>)/).exec(response);
		if (!img) { return null; } img = img[1];

		const hd = (/srcset=".*?([^ ]*?) 2x/).exec(img);
		const sd = (/src="([^"]*)/).exec(img);
		const src = (hd || sd || [ '', '', ])[1];
		if (!src) { return null; }

		let description = (/title="([^"]*)/).exec(img); description = description && description[1];
		let title = (/alt="([^"]*)/).exec(img); title = title && title[1];

		return image({ base: url, src, title, description, });
	},
};

return Self;

}); })();
