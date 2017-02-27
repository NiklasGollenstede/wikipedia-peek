(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { Tabs, Windows, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
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
		const view = this.view = (await new Promise(async got => (global.getViews[(await Windows.create({
			type: 'popup', url: '/ui/view/index.html',
			width: 50, height: 50,
		})).id] = got)));

		closeOnBlur.value && view.addEventListener('blur', () => view.close());
		view.addEventListener('unload', () => { this.view = null; this.post('hide'); });
		view.document.title = `Fallback - Wikipedia Peek`;

		const port = (await (await require.async('common/sandbox'))((await require.async('content/panel.js')), {
			html: (await require.async('content/panel.html')),
			srcUrl: require.toUrl('content/panel.js'),
			host: view.document.body, // needs to reside in the view, otherwise firefox won't give the elements any dimensions
		}));
		Object.assign(port.frame.style, {
			display: '', position: 'fixed',
			border: 'none', top: 0, left: 0,
			width: 'calc(100vw + 2px)', height: 'calc(100vh + 2px)',
		});

		(await port.request('setStyle', style, true));
		const parent  = (await Windows.get((await Tabs.get(this.tabId)).windowId));
		const content = (await port.request('show', preview, parent.width - 20));
		if (gecko && content.devicePixelRatio !== devicePixelRatio) { global.devicePixelRatio = options.advanced.children.devicePixelRatio.value = content.devicePixelRatio; }

		const addTop  = offsetTop[parent.state].value;
		const height  = Math.min((content.height + 40), parent.height - addTop - anchor.top / devicePixelRatio) << 0;
		const width   = content.width + 30 << 0;
		const top     = parent.top + addTop + anchor.top / devicePixelRatio << 0;
		const left    = parent.left + Math.min(Math.max(0,
			(anchor.left + anchor.width / 2) / devicePixelRatio - width / 2 + (gecko ? 10 : 3)
		), parent.width - width) << 0;

		(await Windows.update(view.windowId, {
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
