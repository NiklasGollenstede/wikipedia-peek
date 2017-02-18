(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/utils/': { reportError, },
	'node_modules/web-ext-utils/utils/files': { readDir, },
	'node_modules/web-ext-utils/loader/': { parseMatchPatterns, },
	'common/options': options,
	Evaluator,
}) => {

const loaders = (await Promise.all(readDir('background/loaders').map(name => require.async('background/loaders/'+ name.slice(0, -3)))));
loaders.forEach(loader => (loaders[loader.name] = loader));

const evaluator = new Evaluator;

options.loaders.children.forEach(({ children: options, name, }) => {
	const loader = loaders[name], { normalize, } = loader;
	options.includes.whenChange((_, { current, }) => { try {
		loader.includes = parseMatchPatterns(current);
	} catch (error) { reportError(`Invalid URL pattern`, error); throw error; } });
	options.normalize.whenChange(async value => { try {
		loader.normalize.destroy && loader.normalize.destroy();
		loader.normalize = options.normalize.values.isSet
		? evaluator.newFunction('url', value) : normalize;
	} catch (error) { reportError(`Could not compile normalizer for "${ loader.name }"`, error); throw error; } });
});


const memCache = { };

return {
	async getPreview(sender, url, {
//		cached: allowCached = true,
//		stale: allowStale = false,
	} = { }) { try {
		// find a loader
		let loader, normalized = null; found: { for (loader of loaders) {
			if (
				loader.includes.some(_=>_.test(url))
				&& (normalized = (await loader.normalize(url)))
			) { break found; }
		} return { }; }
		const { key, arg, } = normalized;

		// read cache
//		const cached = allowCached && (await Storage.local.get(cacheKey))[cacheKey]; if (cached) {
//			const isStale = cached.from + cached.for < Date.now();
//			if (!isStale || allowStale) { return { content: cached.content, cached: true, stale: isStale, }; }
//		}
		if (memCache[key]) { return { content: memCache[key], cached: true, stale: false, }; }


		const { content, /*cache,*/ } = (await loader.load(arg));
//		console.log('preview', content.length);

		// write cache
		memCache[key] = content;

		return { content, cached: false, stale: false, };
	} catch(error) {
		reportError(`Failed lo load preview`, error);
		console.error(`Error loading for`, url, error);
		return { failed: true, };
	} },
};

}); })(this);
