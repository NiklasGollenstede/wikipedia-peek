(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	'shim!node_modules/readability/Readability:Readability': Readability,
	'node_modules/regexpx/': RegExpX,
	'node_modules/web-ext-utils/utils/': { reportError, parseMatchPatterns, },
	'background/loader': { register, },
	'background/utils': { article, },
	module,
}) => { /* global URL, */

const options = (await register({
	name: module.id.split('/').pop(),
	title: 'Readability.js',
	description: `Generic fallback loader. Uses Mozilla's <var>Readability.js</var>, the same thing that powers the reader mode in Firefox, to extract content.<br>
		Can be used on <code>&lt;all_urls&gt</code>, but do expect quite some useless previews.`,

	priority: -999,
	includes: [
		'<all_urls>',
	],
	options: {
		exclude: {
			title: 'Exclude Targets',
			maxLength: Infinity,
			default: [ String.raw`^.*\.(?:jpeg|jpg|png|gif|svg|pdf)$`, ],
			restrict: { unique: '.', match: {
				exp: (/^(?:\^.*\$|(?:(\*|http|https|file|ftp|app):\/\/(\*|(?:\*\.)?[^\/\*\ ]+|)\/([^\ ]*)))$/i),
				message: `Each pattern must be of the form <scheme>://<host>/<path> or be framed with '^' and '$'`,
			}, },
			input: { type: 'string', default: '', },
		},
	},

	load,
}));

let exclude; options.exclude.whenChange(values => { try {
	exclude = parseMatchPatterns(values);
} catch (error) { reportError(`Invalid URL pattern`, error); } });

const separators = [ '-', '–', '—', '|', '::', ];
const lastSegment = RegExpX('n')` \ ${ separators } \ ( . (?! \ ${ separators } \ ) )* $`; // matches from the last space framed separator (inclusive) to the end

async function load(url) {
	if (exclude.some(_=>_.test(url))) { return null; }
	url = new URL(url);

	const { response: document, } = (await HttpRequest({ url, responseType: 'document', }).catch(() => ({ response: null, })));
	if (!document) { return null; }

	document.querySelectorAll(`
		.hidden,
		[id^="cite_ref"], .noprint,
		[role="note"],
		script, link, style, meta
	`).forEach(_=>_.remove());

	// TODO: if url.hash, remove everything in the DOM before `#${ url.hash }`?

	let parsed; try { parsed = new Readability(makeURI(url), document).parse(); } catch (error) { console.error(`Readability.js threw:`, error); }
	if (!parsed || !parsed.excerpt) { return null; }

	const title = parsed.title.replace(lastSegment, ''); // .split(/ (?:-|–|—|\||::) /)[0]; // TODO: only remove the last compartment? (done)
	let text = parsed.excerpt.replace(/(?: \(\) )/, ''); // TODO: this should be escaped

	const titleAt = text.search(RegExpX('i')`${ title }`);
	if (titleAt >= 0) {
		text = '<span>'+ text.slice(0, titleAt) +'<b>'+ text.slice(titleAt, titleAt + title.length) +'</b>'+ text.slice(titleAt + title.length) +'</span>';
	} else {
		text = `<p><b>${ title }</b></p><span>${ text }</span>`;
	}

	return article({ html: text, });
}

function makeURI(url) { return {
	spec: url.href, host: url.host,
	prePath: url.protocol + "//" + url.host,
	scheme: url.protocol.substr(0, url.protocol.indexOf(":")),
	pathBase: url.protocol + "//" + url.host + url.pathname.substr(0, url.pathname.lastIndexOf("/") + 1),
}; }

}); })(this);
