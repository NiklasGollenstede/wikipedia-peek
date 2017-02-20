(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/string': { fuzzyMatch, },
	'node_modules/web-ext-utils/utils/': { reportError, },
	Evaluator,
}) => {

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


function article({ width, minHeight, thumb, text, }) {
	const thumbWidth = thumb.width / devicePixelRatio;
	if (thumbWidth && width - thumbWidth < 100) { width = thumbWidth + 24; }
	else if (thumbWidth && width - thumbWidth < 180) { width = thumbWidth + 200; }
	else if (width < 150) { width = 150; }
	return (
		`<style>
			#content { width: ${ width << 0 }px; min-height: ${ minHeight << 0 }px; }
			article>:first-child { margin-top: 0; }
			article>:last-child { margin-bottom: 0; }
			.thumb {
				float: right;
				margin: 3px 3px 3px 10px;
			}
		</style>`
		+ (thumb.source ? `<img
			src="${ thumb.source }" class="thumb" alt="loading..."
			style="width: ${ thumbWidth }px; height: ${ thumb.height / devicePixelRatio }px;"
		>` : '')
		+ `<article>${ text }</article>`
	);
}


function setFunctionOnChange(loader, options, func, name = func.name) {
	options[name].whenChange(async value => { try {
		loader[name].destroy && loader[name].destroy();
		loader[name] = options[name].values.isSet
		? Evaluator.newFunction('url', value) : func;
	} catch (error) { reportError(`Could not compile "${ name }" for "${ loader.name }"`, error); throw error; } });
}

return {
	sanatize,
	extractSection,
	fuzzyFind,
	article,
	setFunctionOnChange,
};

}); })();
