(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/utils/': { reportError, reportSuccess, },
	'node_modules/web-ext-utils/utils/files': { readDir, },
	'node_modules/web-ext-utils/loader/': { parseMatchPatterns, },
	'common/options': options,
	require,
}) => {

const loaders = (await Promise.all(readDir('background/loaders').map(name => require.async('background/loaders/'+ name.slice(0, -3)))));
loaders.forEach(loader => (loaders[loader.name] = loader));
function sortLoaders() { loaders.sort((a, b) => {
	return options.loaders.children[b.name].children.priority.value - options.loaders.children[a.name].children.priority.value;
}); } sortLoaders();

options.loaders.children.forEach(({ children: options, name, }) => {
	const loader = loaders[name];
	options.includes.whenChange(values => { try {
		loader.includes = parseMatchPatterns(values);
	} catch (error) { reportError(`Invalid URL pattern`, error); throw error; } });
	options.priority.onChange(sortLoaders);
});

const memCache = new Map;

options.advanced.children.resetCache.onChange((_, __, { values, }) => {
	if (!values.isSet) { return; } values.reset();
	memCache.clear();
	reportSuccess('Cache cleared');
});

return {
	clear(url) { if (url === undefined) { memCache.clear(); } else { memCache.delete(url);} },
	async getPreview(sender, url) {

		// (await new Promise(done => setTimeout(done, 99999999999)));

		const cached = memCache.get(url); if (cached !== undefined) { return cached; }

		for (const loader of loaders) { try {
			if (!loader.includes.some(_=>_.test(url))) { continue; }
			const content = (await loader.load(url));
			if (!content == null) { continue; }
			memCache.set(url, content);
			return content;
		} catch(error) {
			reportError(`Failed lo load preview`, error);
			console.error(`Error loading for`, url, error);
		} }

		memCache.set(url, null);
		return null;
	},
};

}); })(this);
