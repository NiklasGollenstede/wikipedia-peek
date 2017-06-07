(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/port': _, // for Messages
	'node_modules/web-ext-utils/browser/': { manifest, browserAction, Tabs, Messages, runtime, },
	'node_modules/web-ext-utils/browser/version': { gecko, fennec, },
	'node_modules/web-ext-utils/loader/': { ContentScript, detachFormTab, },
	'node_modules/web-ext-utils/loader/views': Views,
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/web-ext-utils/utils/': { reportError, reportSuccess, },
	'node_modules/web-ext-utils/utils/files': { readDir, },
	'common/options': options,
	Fallback, // loading this on demand is to slow in fennec
	Loader,
	remote,
	require,
}) => {

let debug; options.debug.whenChange(([ value, ]) => { debug = value; require('node_modules/web-ext-utils/loader/').debug = debug >= 2; });
debug && console.info(manifest.name, 'loaded, updated', updated);

browserAction.setIcon({ path: manifest.icons, }); // fennec 55 nightly doesn't like browserAction icons in the manifest
void remote; // the remote plugin handler just needs to be loaded early

// Messages
Messages.addHandler(function getPreview() { return Loader.getPreview(this, ...arguments); }); // eslint-disable-line no-invalid-this
Messages.addHandler('reportError', reportError);
Messages.addHandlers('Fallback.', Fallback);


// Loaders
(await Promise.all(readDir('background/loaders').map(name => require.async('background/loaders/'+ name.slice(0, -3)))));
options.advanced.children.resetCache.onChange((_, __, { values, }) => {
	if (!values.isSet) { return; } values.reset();
	Loader.clearCache();
	reportSuccess('Cache cleared');
});


// ContentScript
const content = new ContentScript({
	modules: [ 'content/index', ],
});
options.include.whenChange(values => {
	try { content.include = values; } catch (error) { reportError(`Invalid URL pattern`, error); throw error; }
});
options.include.children.exclude.whenChange(values => {
	try { content.exclude = values; } catch (error) { reportError(`Invalid URL pattern`, error); throw error; }
});
options.include.children.incognito.whenChange(([ value, ]) => {
	content.incognito = value;
});
options.debug.whenChange(updateConfig);
options.advanced.onAnyChange(updateConfig);
function updateConfig() { content.modules = { 'content/index': {
	debug: debug,
	touchMode: options.advanced.children.touchMode.value,
	excludeAnchor: {
		match: options.advanced.children.excludeAnchor.children.match.values.current,
		contain: options.advanced.children.excludeAnchor.children.contain.values.current,
	},
	showDelay: options.advanced.children.showDelay.value,
	fallback: options.advanced.children.fallback.value && {
		always: options.advanced.children.fallback.children.always.value,
	},
}, }; }

browserAction.onClicked.addListener(onClick);
async function onClick() { try {

	const tab = (await Tabs.query({ currentWindow: true, active: true, }))[0];
	if ((await content.appliedToFrame(tab.id, 0))) {
		detachFormTab(tab.id, 0);
	} else {
		onMatch(...(await content.applyToFrame(tab.id, 0)));
	}

} catch (error) { reportError(error); } }

browserAction.setBadgeBackgroundColor({ color: [ 0x00, 0x7f, 0x00, 0x60, ], });

content.onMatch.addListener(onMatch); function onMatch(frame, url, done) {
	done.catch(reportError);
	!frame.frameId && browserAction.setBadgeText({ tabId: frame.tabId, text: '✓', });
	!frame.frameId && browserAction.setTitle({ tabId: frame.tabId, title: 'Disable '+ manifest.name, });
	debug && console.info('match frame', frame.tabId, frame.frameId, frame.incognito);
	frame.onRemove.addListener(frame => debug && console.info('frame removed', frame));
}
content.onShow.addListener(frame => {
	!frame.frameId && browserAction.setBadgeText({ tabId: frame.tabId, text: '✓', });
	!frame.frameId && browserAction.setTitle({ tabId: frame.tabId, title: 'Disable '+ manifest.name, });
	debug && console.info('show frame (again)', frame);
});
content.onHide.addListener(frame => {
	!frame.frameId && browserAction.setBadgeText({ tabId: frame.tabId, text: '', }).catch(_=>_);
	!frame.frameId && browserAction.setTitle({ tabId: frame.tabId, title: 'Enable '+ manifest.name, }).catch(_=>_);
	debug && console.info('hide frame', frame);
});

content.onHide.addListener(() => Fallback.hide());

(await content.applyNow());


// page compatibility
const defaultFixes = Object.create(null), custonFixes = [ ];
const getOptions = ([ active, include, script, ]) => ({
	script, include: active ? include.split(/\s+/) : [ ],
	incognito: options.include.children.incognito.value,
});
options.fixes.children.forEach(fix => fix.name !== 'custom' && fix.whenChange(([ value, ]) => defaultFixes[fix.name]
	? Object.assign(defaultFixes[fix.name], getOptions(value))
	: (defaultFixes[fix.name] = new ContentScript(getOptions(value)))
));
options.fixes.children.custom.whenChange(fixes => custonFixes.splice(0, Infinity, ...fixes.map(
	value => new ContentScript(getOptions(value)))
).forEach(_=>_.destroy()));


// browser compatibility
gecko && options.advanced.children.devicePixelRatio.whenChange(value => {
	global.devicePixelRatio = value; // the devicePixelRatio in the background page is always 1
});
gecko && Views.onOpen(({ view, }) => global.devicePixelRatio !== view.devicePixelRatio && (options.advanced.children.devicePixelRatio.value = view.devicePixelRatio));
fennec && debug && (await runtime.openOptionsPage());


// debugging
Object.assign(global, {
	options, content, onClick,
	Browser: require('node_modules/web-ext-utils/browser/'),
	Loader:  require('node_modules/web-ext-utils/loader/'),
	Utils:   require('node_modules/web-ext-utils/utils/'),
});

}); })(this);
