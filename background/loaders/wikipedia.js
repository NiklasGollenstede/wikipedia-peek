(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	'background/loader': { register, },
	'background/utils': { extractSection, article, setFunctionOnChange, },
	'common/options': { advanced: { children: advanced, }, },
	module,
}) => { /* global URL, */

const options = (await register({
	name: module.id.split('/').pop(),
	title: `Wikipedia and Mediawiki`,
	description: `Works for links to Wikipedia articles and most other Wikimadia resources such as Wikinews.
	<br>If configured correctly, it should also work with Mediawikis hosted by other organizations.`,

	priority: 2,
	includes: [
		'*://*.wikipedia.org/wiki/*', '*://*.mediawiki.org/wiki/*',
		String.raw`^https?://([\w-]+\.)*wiki[\w.-]*\.org/wiki/.*$`,
		'*://*.gamepedia.com/*',
		// String.raw`^https?:\/\/([\w-]+\.)*?(wiki[\w-]+|[\w-]+pedia)(\.[\w-]+)*\/wiki\/.*$`, //
	],
	options: {
		getApiPath: {
			title: 'getApiPath',
			description: `Stateless function that, given an included URL, returns the path to the MediaWiki API endpoint, usually <code>.../api.php</code>.<br><br>
				function getApiPath(url : string) {
			`,
			expanded: false,
			default: (getApiPath+'').split('\n').slice(1, -1).map(_=>_.replace(/^\t/, '')).join('\n'),
			restrict: { },
			input: { type: 'code', lang: 'js', suffix: `}`, },
		},
		getArticleName: {
			title: 'getArticleName',
			description: `Stateless function that, given an included URL, returns the article title and section, separated by a <code>#</code>.<br><br>
				function getArticleName(url : string) {
			`,
			expanded: false,
			default: (getArticleName+'').split('\n').slice(1, -1).map(_=>_.replace(/^\t/, '')).join('\n'),
			restrict: { },
			input: { type: 'code', lang: 'js', suffix: `}`, },
		},
	},

	load,
}));

const functions = { getApiPath, getArticleName, };
setFunctionOnChange(functions, options, getApiPath);
setFunctionOnChange(functions, options, getArticleName);

async function load(url) {
	// if (Math.random() > .5) { return ''; } // TODO: remove
	const api = (await functions.getApiPath(url));
	const name = (await functions.getArticleName(url));
	const lang = (/:\/\/([^.]*)/).exec(url)[1];
	if (!api || !name) { return null; }
	const [ , title, section, ] = (/^(.*?)(?:#(.*))?$/).exec(name);
	return doLoad(api, title, section, lang);
}

async function doLoad(api, title, section, lang) {

	const thumbPx = advanced.thumb.children.size.value * global.devicePixelRatio;
	const src = (
		api +'?action=query&format=json&formatversion=2&redirects='
		+ '&prop=extracts|pageimages'
		+ (section ? '' : '&exintro=')
		+ '&piprop=thumbnail|original&pithumbsize='+ thumbPx
		+ '&titles='+ title
	);

	const { response, } = (await HttpRequest({ src, responseType: 'json', }));
	if (!response || !response.query) { return null; }

	const redirect = response.query.redirects && response.query.redirects[0] || { };
	if (redirect.tofragment) { if (section) {
		section = redirect.tofragment;
	} else {
		return doLoad(api, global.encodeURIComponent(redirect.to), global.encodeURIComponent(redirect.tofragment).replace(/\./g, '%2E').replace(/%/g, '.'));
	} }

	const page = response.query.pages[0];

	const thumb = !section && advanced.thumb.value && page.thumbnail || { width: 0, height: 0, };
	const html = extractSection(page.extract || '', section).replace(/<p>\s*<\/p>/, '');

	return article({ html, thumb, lang, });
}

function getApiPath(url) {
	url = new URL(url);
	if ((/(?:^|\.)(?:wiki[^\.]*?|mediawiki)\.org$/).test(url.hostname)) {
		return 'https://'+ url.host +'/w/api.php'; // always use https
	}
	return 'https://'+ url.host +'/api.php'; // always use https
}

function getArticleName(url) {
	url = new URL(url);
	const title = url.pathname.replace(/^\/(?:wiki\/)?/, '');
	if (url.search || (/^(?:File|Special|Portal):/).test(title)) { return ''; }
	if ((/\.(?:jpe?g|png|gif|svg)$/).test(title)) { return null; }
	const section = url.hash.slice(1);
	return title +'#'+ section;
}

return { options, load, };

}); })(this);
