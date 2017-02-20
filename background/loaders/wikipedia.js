(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	'background/utils': { sanatize, extractSection, article, setFunctionOnChange, },
	module,
}) => {

let options, allOptions; require.async('common/options').then(_ => {
	allOptions = _; options = _.loaders.children[Self.name].children.options.children;
	setFunctionOnChange(Self, options, getApiPath);
	setFunctionOnChange(Self, options, getArticleName);
});

function getApiPath(url) {
	url = new URL(url);
	if ((/(?:^|\.)(?:wiki.*?|mediawiki)\.org$/).test(url.hostname)) {
		return 'https://'+ url.host +'/w/api.php'; // always use https
	}
	return null;
}

function getArticleName(url) {
	url = new URL(url);
	const title = url.pathname.replace(/^\/(?:wiki\/)?/, '');
	if (url.search || (/^(?:File|Special|Portal):|\.(?:jpe?g|png|gif|svg)$/).test(title)) { return null; }
	const section = url.hash.slice(1);
	return title +'#'+ section;
}

const Self = {
	name: module.id.split('/').pop(),
	title: `Wikipedia and Mediawiki`,
	description: ``,

	priority: 2,
	includes: [ String.raw`^https://.*\.wiki.*?\.org/wiki/.*$`, 'https://*.mediawiki.org/wiki/*', ],
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

	getApiPath, getArticleName,

	async load(url) {
		const api = (await Self.getApiPath(url));
		const name = (await Self.getArticleName(url));
		if (!api || !name) { return null; }
		const [ , title, section, ] = (/^(.*?)(?:#.*)?$/).exec(name);
		return Self.doLoad(api, title, section);
	},

	async doLoad(api, title, section) {

		const thumbPx = allOptions.thumb.children.size.value * devicePixelRatio;
		const src = (
			api +'?action=query&format=json&formatversion=2&redirects='
			+ '&prop=extracts|pageimages'
			+ (section ? '' : '&exintro=')
			+ '&piprop=thumbnail|original&pithumbsize='+ thumbPx
			+ '&titles='+ title
		);

		const { response, } = (await HttpRequest({ src, responseType: 'json', }));
		const redirect = response.query && response.query.redirects && response.query.redirects[0] || { };
		if (redirect.tofragment) { if (section) {
			section = redirect.tofragment;
		} else {
			return Self.doLoad(api, redirect.to, redirect.tofragment);
		} }

		const page = response.query.pages[0];

		const thumb = allOptions.thumb.value && page.thumbnail || { width: 0, height: 0, };
		const [ text, length, ] = sanatize(extractSection(page.extract || '', section).replace(/<p>\s*<\/p>/, ''));
		if (!thumb.source && length < 20) { return null; }

		const minHeight = thumb.height / devicePixelRatio + 20;
		const width = Math.sqrt(length * 225 + (thumb.height / devicePixelRatio + 20) * (thumb.width / devicePixelRatio + 20));

		return article({ width, minHeight, thumb, text, });
	},
};

return Self;

}); })();
