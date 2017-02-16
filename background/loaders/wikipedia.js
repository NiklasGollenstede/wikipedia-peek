(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	'background/utils': { sanatize, extractSection, article, },
	module,
}) => {

return {
	name: module.id.split('/').pop(),
	title: `Wikipedia and Mediawiki`,
	description: ``,

	includes: [ 'https://*.wikipedia.org/wiki/*', 'https://*.mediawiki.org/wiki/*', ], // user editable, will be replaced by RegExps

	normalize(url) { // user editable, will be executed in a sandbox
		url = new URL(url);
		const origin = url.origin;
		const segments = url.pathname.slice(1).split('/');
		const title = segments.pop();
		if (url.search || title.includes(':')) { return null; }
		let path = [ ];
		if (segments[0] === 'wiki') { segments.shift(); path.unshift('w'); }
		else { path.unshift('wiki'); }
		path.push(...segments, 'api.php');
		path = path.join('/');
		const section = url.hash.slice(1);
		return {
			key: origin +'$'+ path +'?'+ title +'#'+ section,
			arg: { origin, path, title, section, },
		};
	},

	async load({ origin, path, title, section, }) {

		const options = require('common/options');
		const thumbPx = options.thumb.children.size.value * devicePixelRatio;
		const src = (
			origin +'/'+ path
			+ '?action=query&format=json&formatversion=2&redirects='
			+ '&prop=extracts|pageimages'
			+ (section ? '' : '&exintro=')
			+ '&piprop=thumbnail|original&pithumbsize='+ thumbPx
			+ '&titles='+ title
		);

		const { response, } = (await HttpRequest({ src, responseType: 'json', }));
		const redirect = response.query.redirects && response.query.redirects[0] || { };
		if (redirect.tofragment) { if (section) {
			section = redirect.tofragment;
			aliases.push('https://'+ origin +'/wiki/'+ title +'#'+ redirect.tofragment);
		} else {
			return { redirect: 'https://'+ origin +'/wiki/'+ redirect.to +'#'+ redirect.tofragment, };
		} }

		const aliases = [ ];
		const page = response.query.pages[0];

		const thumb = options.thumb.value && page.thumbnail;
		const [ text, length, ] = sanatize(extractSection(page.extract, section).replace(/<p>\s*<\/p>/, ''));

		const minHeight = thumb ? (thumb.height / devicePixelRatio + 20) : 0;
		const width = Math.sqrt(length * 225 + (thumb ? (thumb.height / devicePixelRatio + 20) * (thumb.width / devicePixelRatio + 20) : 0));

		return { cache: {
			aliases,
			for: 3, // days
		}, content: article({ width, minHeight, thumb, text, }), };
	},
};

}); })();
