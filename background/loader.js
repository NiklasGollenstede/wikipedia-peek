(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/storage': { sync: storage, },
	'node_modules/web-ext-utils/utils/': { reportError, parseMatchPatterns, },
	'node_modules/web-ext-utils/options/': Options,
	'common/options': options,
}) => {

const loaders = [ ], loaderOptions = options.loaders.children, memCache = new Map;
async function register(loader) {
	function get(name, type) { const value = loader[name]; if (typeof value === type) { return value; } else { throw new TypeError(`loader.${ name } must be a ${ type } but is a ${ typeof value }`); } }
	const name = get('name', 'string'), title = get('title', 'string'), description = get('description', 'string');
	const priority = get('priority', 'number'), includes = get('includes', 'object'), model = loader.options && get('options', 'object'), load = get('load', 'function');
	if (!(/^[a-zA-Z]\w*$/).test(name)) { throw new TypeError(`Loader.name must be alphanumeric and start with a letter`); }
	if (loaders.some(_=>_.name === name)) { throw new Error(`Duplicate loader name "${ name }"`); }
	if (!Array.isArray(includes) || includes.some(_ => typeof _ !== 'string')) { throw new TypeError(`Loader.includes must be an Array of strings`); }

	const options = new Options({ model: { [name]: {
		title, description,
		expanded: name === 'readability',
		default: true,
		children: {
			priority: {
				default: priority,
				restrict: { type: 'number', },
				input: { type: 'number', prefix: 'Priority:', },
			},
			includes: {
				title: 'Include Targets',
				description: `List of include patterns (see Included Sites) matching URLs for which this loader will be considered.`,
				maxLength: Infinity,
				default: includes,
				restrict: { unique: '.', match: {
					exp: (/^(?:\^\S*\$|<all_urls>|(?:(\*|http|https|file|ftp|app):\/\/(\*|(?:\*\.)?[^\/\*\ ]+|)\/(\S*)))$/i),
					message: `Each pattern must be of the form <scheme>://<host>/<path> or be framed with '^' and '$'`,
				}, },
				input: { type: 'string', default: '', },
			},
			advanced: {
				title: 'Advanced',
				expanded: false,
				default: true,
				hidden: !model,
				children: model,
			},
		},
	}, }, storage, prefix: `options.loaders`, }).children[0].children;

	loaderOptions.splice((loaderOptions.findIndex(_=>_.children.priority.default < priority) + 1 || Infinity) - 1, 0, options.parent);

	loader = { name, title, description, priority, includes, options, load, };
	loaders.push(loader); sortLoaders(); options.priority.onChange(sortLoaders);

	options.includes.whenChange(values => { try {
		loader.includes = parseMatchPatterns(values);
	} catch (error) { reportError(`Invalid URL pattern`, error); } });

	return options.advanced.children;
}

function sortLoaders() { loaders.sort((a, b) => {
	return b.options.priority.value - a.options.priority.value;
}); }

function unregister(options) {
	options = options.parent.parent.children;
	loaders.splice(loaders.findIndex(_=>_.options === options), 1);
	loaderOptions.splice(loaderOptions.indexOf(options.parent), 1);
}

async function getPreview(sender, url) {

	// (await new Promise(done => setTimeout(done, 99999999999)));

	const cached = memCache.get(url); if (cached !== undefined) { return cached; }

	for (const loader of loaders) { try {
		if (!loader.includes.some(_=>_.test(url))) { continue; }
		const content = (await loader.load(url));
		if (!content == null) { continue; }
		memCache.set(url, content);
		return content;
	} catch(error) { reportError(`Failed to load preview`, error); } }

	memCache.set(url, null);
	return null;
}

return {
	register,
	unregister,
	clearCache(url) { if (url === undefined) { memCache.clear(); } else { memCache.delete(url);} },
	getPreview,
};

}); })(this);
