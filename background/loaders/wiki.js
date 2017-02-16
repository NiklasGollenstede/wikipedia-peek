(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/string': { fuzzyMatch, },
	'node_modules/es6lib/network': { HttpRequest, },
	module,
}) => {

return {
	name: module.id.split('/').pop(),
	title: `Wikipedia and Wikia`,
	description: ``,

	includes: [ 'https://*.wikipedia.org/wiki/*', 'https://*.mediawiki.org/wiki/*', 'https://*.wikia.com/wiki/*', ], // user editable, will be replaced by RegExps

	normalize(url) { // user editable, will be executed in a sandbox
		url = new URL(url);
		const title = url.pathname.slice('/wiki/'.length);
		if (url.search || title.includes(':')) { return null; }
		const section = url.hash.slice(1);
		const isWikia = url.host.endsWith('.wikia.com');
		const host = url.host;
		return {
			cacheKey: host +'/'+ title +'#'+ section,
			arg: { host, title, section, isWikia, },
		};
	},

	async load({ host, title, section, isWikia, }) {

		const options = require('common/options');

		const thumbPx = options.thumb.children.size.value * devicePixelRatio;
		isWikia && title.includes(',') && console.warn(`The title "${ title }" contains commas and may not load correctly`);

		const src = 'https://'+ host + (isWikia ? (
			  '/api/v1/Articles/Details/?abstract=500' // 500 is max
			+ '&width='+ thumbPx // +'&height='+ thumbPx
			+ '&titles='+ title
		) : (
			  '/w/api.php?action=query&format=json&formatversion=2&redirects='
			+ '&prop=extracts|pageimages'
			+ (section ? '' : '&exintro=')
			+ '&piprop=thumbnail|original&pithumbsize='+ thumbPx
			+ '&titles='+ title
		));

		const { response, } = (await HttpRequest({ src, responseType: 'json', }));
		const aliases = [ ]; let thumb, article, length;

		if (isWikia) {
			const page = response.items[Object.keys(response.items)[0]];

			if (/^REDIRECT /.test(page.abstract)) {
				return { redirect: 'https://'+ host +'/wiki/'+ page.abstract.slice(9), };
			}

			thumb = page.thumbnail && {
				source: page.thumbnail
				.replace(/\/x-offset\/\d+/, '/x-offset/0').replace(/\/window-width\/\d+/, '/window-width/'+ page.original_dimensions.width)
				.replace(/\/y-offset\/\d+/, '/y-offset/0').replace(/\/window-height\/\d+/, '/window-height/'+ page.original_dimensions.height),
				width: thumbPx, height: (page.original_dimensions.height / page.original_dimensions.width * thumbPx) << 0,
			};
			if (section) {
				const { response, } = (await HttpRequest({ src: `https://${ host }/api/v1/Articles/AsSimpleJson?id${ page.id }`, responseType: 'json', }));
				const section = fuzzyFind(response.sections.map(_=>_.title), section.replace(/_/g, ' '));
				[ article, length, ] = sanatize(
					response.sections.find(_=>_.title === section).content
					.filter(_=>_.type === 'paragraph')
					.map(({ text, }) => `<p>${ text }</p>`).join('')
				);
			} else {
				[ article, length, ] = sanatize(`<p>${ page.abstract }</p>`);
			}
		} else {
			const page = response.query.pages[0];
			const redirect = response.query.redirects && response.query.redirects[0] || { };

			if (redirect.tofragment) { if (section) {
				section = redirect.tofragment;
				aliases.push('https://'+ host +'/wiki/'+ title +'#'+ redirect.tofragment);
			} else {
				return { redirect: 'https://'+ host +'/wiki/'+ redirect.to +'#'+ redirect.tofragment, };
			} }
			thumb = options.thumb.value && page.thumbnail;
			[ article, length, ] = sanatize(extractSection(page.extract, section).replace(/<p>\s*<\/p>/, ''));
		}

		const minHeight = thumb ? (thumb.height / devicePixelRatio + 20) : 0;
		const width = Math.sqrt(length * 225 + (thumb ? (thumb.height / devicePixelRatio + 20) * (thumb.width / devicePixelRatio + 20) : 0));

		return { cache: {
			aliases,
			for: 3, // days
		}, content: (
			`<style>
				#content { width: ${ width << 0 }px; min-height: ${ minHeight << 0 }px; }
				article>:first-child { margin-top: 0; }
				article>:last-child { margin-bottom: 0; }
				.thumb {
					float: right;
					margin: 5px 0 3px 10px;
				}
			</style>`
			+ (thumb ? `<img src="${ thumb.source }" class="thumb" alt="loading..." style="width: ${ thumb.width / devicePixelRatio }px; height: ${ thumb.height / devicePixelRatio }px;">` : '')
			+ `<article>${ article }</article>`
		), };
	},
};


/**
 * Removes any tags (not their content) that are not listed in 'allowed' and any attributes except for href (not data: or javascript:) and title (order must be href, title)
 * @param  {string}               html  Untrusted HTML markup.
 * @return {[ string, number, ]}        Sanitized, undangerous, simple HTML and the text length of that HTML.
 */
function sanatize(html) {
	const allowed = /^(?:a|b|big|br|code|div|i|p|pre|li|ol|ul|span|sup|sub|tt|math|semantics|annotation(?:-xml)?|m(?:enclose|error|fenced|frac|i|n|o|over|padded|root|row|s|space|sqrt|sub|supsubsup|table|td|text|tr|under|underover))$/;
	let tagLength = 0;
	const text = html.replace(
		(/<(\/?)(\w+)[^>]*?(\s+href="(?!(?:javascript|data):)[^"]*?")?(\s+title="[^"]*?")?[^>]*?>/g),
		(match, slash, tag, href, title) => {
			tagLength += match.length;
			return allowed.test(tag) ? ('<'+ slash + tag + (title || '') + (href ? href +'target="_blank"' : '') +'>') : '';
		}
	);
	return [ text, html.length - tagLength, ];
}

/**
 * Extracts a #section from an article
 * @param  {string}  html  HTML markup
 * @param  {string}  id    Optional id of the section to extract
 * @return {string}        The HTML section between a header section that contains an `id=${ id }` and the next header section
 */
function extractSection(html, id) {
	if (!id) { return html; }

	// the ids linked tend to be incorrect, so this finds the closest one actually present
	const ids = [ ], getId = (/id="(.*?)"/g); let m; while ((m = getId.exec(html))) { ids.push(m[1]); }
	const _id = fuzzyFind(ids, id);

	const exp = new RegExp(String.raw`id="${ _id }"[^]*?\/h\d>[^]*?(<[a-gi-z][a-z]*>[^]*?)(?:<h\d|$)`, 'i');
	const match = exp.exec(html);
	if (!match) { console.error(`Failed to extract section "${ id }" /${ exp.source }/ from ${ html }`); return html; }
	return match[1];
}

/**
 * Finds the string in an array that best matches the search string.
 * @param  {[string]}  array   The array in which to search.
 * @param  {string}    string  The string for which to search.
 * @return {string}            The string in an array that best matches the search string.
 */
function fuzzyFind(array, string) {
	const norms = array.map(item => fuzzyMatch(string, item, 2));
	return array[norms.indexOf(norms.reduce((a, b) => a >= b ? a : b))];
}

}); })();
