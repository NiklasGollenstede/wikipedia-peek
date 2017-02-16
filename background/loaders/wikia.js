(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	'background/utils': { sanatize, fuzzyFind, article, },
	module,
}) => {

return {
	name: module.id.split('/').pop(),
	title: `Wikia.com`,
	description: ``,

	includes: [ 'https://*.wikia.com/wiki/*', ], // user editable, will be replaced by RegExps

	normalize(url) { // user editable, will be executed in a sandbox
		url = new URL(url);
		const title = url.pathname.replace(/^\/(?:wiki\/)?/, '');
		if (url.search || title.includes(':')) { return null; }
		const section = url.hash.slice(1);
		const host = url.host;
		return {
			key: host +'/'+ title +'#'+ section,
			arg: { host, title, section, },
		};
	},

	async load({ host, title, section, }) {

		const options = require('common/options');
		const thumbPx = options.thumb.children.size.value * devicePixelRatio;

		title.includes(',') && console.warn(`The title "${ title }" contains commas and may not load correctly`);

		const src = (
			'https://'+ host
			+'/api/v1/Articles/Details/?abstract=500' // 500 is max
			+ '&width='+ thumbPx // +'&height='+ thumbPx
			+ '&titles='+ title
		);

		const { response, } = (await HttpRequest({ src, responseType: 'json', }));
		const page = response.items[Object.keys(response.items)[0]];
		if (/^REDIRECT /.test(page.abstract)) {
			return { redirect: 'https://'+ host +'/wiki/'+ page.abstract.slice(9), };
		}

		const thumb = page.thumbnail && {
			source: page.thumbnail
			.replace(/\/x-offset\/\d+/, '/x-offset/0').replace(/\/window-width\/\d+/, '/window-width/'+ page.original_dimensions.width)
			.replace(/\/y-offset\/\d+/, '/y-offset/0').replace(/\/window-height\/\d+/, '/window-height/'+ page.original_dimensions.height),
			width: thumbPx, height: (page.original_dimensions.height / page.original_dimensions.width * thumbPx) << 0,
		};
		let html; if (section) {
			const { response, } = (await HttpRequest({ src: `https://${ host }/api/v1/Articles/AsSimpleJson?id${ page.id }`, responseType: 'json', }));
			const section = fuzzyFind(response.sections.map(_=>_.title), section.replace(/_/g, ' '));
			html = response.sections.find(_=>_.title === section).content
			.filter(_=>_.type === 'paragraph')
			.map(({ text, }) => `<p>${ text }</p>`).join('');
		} else {
			html = `<p>${ page.abstract }</p>`;
		}
		const [ text, length, ] = sanatize(html);

		const minHeight = thumb ? (thumb.height / devicePixelRatio + 20) : 0;
		const width = Math.sqrt(length * 225 + (thumb ? (thumb.height / devicePixelRatio + 20) * (thumb.width / devicePixelRatio + 20) : 0));

		return { cache: {
			for: 3, // days
		}, content: article({ width, minHeight, thumb, text, }), };
	},
};

}); })();
