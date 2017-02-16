(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/port': _,
	'node_modules/web-ext-utils/browser/': { browserAction, Tabs, WebNavigation, Messages, },
	// 'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/loader/': { ContentScript, runInTab, },
	'node_modules/web-ext-utils/update/': updated,
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
	Loader,
}) => {

updated.extension.to.channel !== '' && console.info('Ran updates', updated);

const content = new ContentScript({
	runAt: 'document_end',
	modules: [ 'content/index', ],
});

options.include.whenChange((_, { current, }) => {
	try { content.include = current; } catch (error) { reportError(`Invalid URL pattern`, error); throw error; }
});

browserAction && browserAction.onClicked.addListener(onClick);
async function onClick() { try {

	const tab = (await Tabs.query({ currentWindow: true, active: true, }))[0];
	(await content.applyToFrame(tab.id, 0));

} catch (error) { reportError(error); throw error; } }

Messages.addHandler(function getPreview() { return Loader.getPreview(this, ...arguments); }); // eslint-disable-line no-invalid-this

(await content.applyNow());

Object.assign(global, { options, reportError, WebNavigation, runInTab, onClick, }); // for debugging

}); })(this);
