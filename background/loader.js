(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/port': Port,
//	'node_modules/web-ext-utils/browser/': { Storage, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/utils/': { reportError, },
	'node_modules/web-ext-utils/utils/files': { readDir, },
	'node_modules/web-ext-utils/loader/': { parseMatchPatterns, },
	'common/sandbox': makeSandbox,
	'common/options': options,
}) => {

makeSandbox = !gecko ? makeSandbox
: init => { // Skip sandboxing and directly evaluate here. Only meant as a temporary fix to use this API in Firefox.
	console.warn(`Firefox doesn't support sandboxing in WebExtensions, will evaluate directly!`);
	const { port1, port2, } = new MessageChannel;
	init(new Port(port2, Port.MessagePort));
	return new Port(port1, Port.MessagePort);
};

const sandbox = (await makeSandbox(port => {
	const FunctionCtor = (x=>x).constructor;
	const normalize = { };
	port.addHandlers({
		setNormalize(loader, code) {
			normalize[loader] = () => { throw new Error(`Could not compile normalize function for loader "${ loader }"`); };
			normalize[loader] = new FunctionCtor('url', code);
		},
		callNormalize(loader, url) {
			return normalize[loader](url);
		},
	});
}));

options.loaders.children.forEach(loader => {
	loader.children.includes.whenChange(value => {
		try { loader.model.loader.includes = parseMatchPatterns(value.split(' ')); } catch (error) { reportError(`Invalid URL pattern`, error); throw error; }
	});
	loader.children.normalize.whenChange(async value => {
		try { (await sandbox.request('setNormalize', loader.name, value)); } catch (error) { reportError(`Could not compile normalizer for "${ loader.name }"`, error); throw error; }
	});
});


const loaders = (await Promise.all(readDir('background/loaders').map(name => require.async('background/loaders/'+ name.slice(0, -3)))));

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
				&& (normalized = (await sandbox.request('callNormalize', loader.name, url)))
				// && (normalized = loader.normalize(url))
			) { break found; }
		} return { }; }
		const cacheKey = 'cache$'+ normalized.cacheKey, { arg, } = normalized;

		// read cache
//		const cached = allowCached && (await Storage.local.get(cacheKey))[cacheKey]; if (cached) {
//			const isStale = cached.from + cached.for < Date.now();
//			if (!isStale || allowStale) { return { content: cached.content, cached: true, stale: isStale, }; }
//		}
		if (memCache[cacheKey]) { return { content: memCache[cacheKey], cached: true, stale: false, }; }


		const { content, /*cache,*/ } = (await loader.load(arg));
//		console.log('preview', content.length);

		// write cache
		memCache[cacheKey] = content;

		return { content, cached: false, stale: false, };
	} catch(error) {
		reportError(`Failed lo load preview`, error);
		console.error(`Error loading for`, url, error);
		return { failed: true, };
	} },
};

}); })(this);
