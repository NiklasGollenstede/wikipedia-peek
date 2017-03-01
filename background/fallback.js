(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { Tabs, Windows, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
	'common/sandbox': makeSandbox,
	'content/panel.js': js,
	'content/panel.html': html,
	require,
}) => {

global.getViews = { };

const offsetTop = options.advanced.children.fallback.children.offsetTop.children;
const closeOnBlur = options.advanced.children.fallback.children.closeOnBlur;

const fallbacks = new Set;

async function handleFallback(fallback) {
	fallbacks.add(fallback);
	fallback.ended.then(() => {
		methods.hide.call(fallback);
		fallbacks.delete(fallback);
	});
	fallback.addHandlers(methods, fallback);
}

const methods = {
	async show(preview, anchor, style) { try {
		// TODO: the tab based fallback made has one serious conceptional flaw: it is virtually impossible to actually click the original link. And it is too slow (on a phone)
		const tab = Windows ? (await Windows.create({
			type: 'popup', url: '/ui/view/index.html',
			width: 50, height: 50,
		})).tabs[0] : (await Tabs.create({
			url: '/ui/view/index.html',
			active: true,
			[!gecko ? 'openerTabId' : 'index']: this.tabId,
			index: (await Tabs.get(this.tabId)).index,
		}));
		const view = this.view = (await new Promise(async got => (global.getViews[tab.id] = got)));

		closeOnBlur.value && view.addEventListener('blur', () => view.close());
		view.addEventListener('unload', () => { this.view = null; this.post('hide'); port.destroy(); });
		view.document.title = `Fallback - Wikipedia Peek`;

		const port = (await makeSandbox(js, {
			html: html,
			srcUrl: require.toUrl('content/panel.js'),
			host: view.document.body, // needs to reside in the view, otherwise firefox won't give the elements any dimensions
		}));
		Object.assign(port.frame.style, {
			display: '', position: 'fixed',
			border: 'none', top: 0, left: 0,
			width: 'calc(100vw + 2px)', height: 'calc(100vh + 2px)',
		});
		!Windows && closeOnBlur.value && port.request('await click').then(() => Tabs.remove(view.tabId), () => void 0).then(() => console.log('onclick resolved'));

		(await port.request('setStyle', style, true));
		const parent  = Windows && (await Windows.get((await Tabs.get(this.tabId)).windowId));
		const content = (await port.request('show', preview, parent ? parent.width - 20 : 999999));
		if (gecko && content.devicePixelRatio !== devicePixelRatio) { global.devicePixelRatio = options.advanced.children.devicePixelRatio.value = content.devicePixelRatio; }

		if (!Windows) { return; }

		const addTop  = offsetTop[parent.state].value;
		const height  = Math.min((content.height + 40), parent.height - addTop - anchor.top / devicePixelRatio) << 0;
		const width   = content.width + 30 << 0;
		const top     = parent.top + addTop + anchor.top / devicePixelRatio << 0;
		const left    = parent.left + Math.min(Math.max(0,
			(anchor.left + anchor.width / 2) / devicePixelRatio - width / 2 + (gecko ? 10 : 3)
		), parent.width - width) << 0;

		(await Windows.update(tab.windowId, {
			top, left, width, height, state: 'normal',
		}));
	} catch (error) { reportError('Fallback mode failed', error); this.view && this.view.close(); throw error; } },

	hide() {
		this.view && this.view.close();
	},
};

return {
	add: handleFallback,
};

}); })(this);
