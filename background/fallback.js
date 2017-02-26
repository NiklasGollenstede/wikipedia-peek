(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { Tabs, Windows, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
}) => {

global.getViews = { };

const barHeight = gecko ? { // TODO: use options for these
	maximized: 70,
	normal: 90,
} : {
	maximized: 83,
	normal: 88,
};

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
		const parent  = (await Windows.get((await Tabs.get(this.tabId)).windowId));
		const top     = parent.top + (barHeight[parent.state] || 0) + anchor.top / devicePixelRatio << 0;

		const view = this.view = (await new Promise(async got => (global.getViews[(await Windows.create({
			type: 'popup', url: '/ui/view/index.html',
			top, // firefox (52) ignores positions in .create()
			width: 50, height: 50,
		})).id] = got)));

		view.addEventListener('blur', () => view.close());
		view.addEventListener('unload', () => {
			this.view = null;
			this.post('hide');
		});
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
		const content = (await port.request('show', preview, parent.width - 20));

		const height  = Math.min((content.height + 40), parent.height - (barHeight[parent.state] || 0) - anchor.top / devicePixelRatio) << 0;
		const width   = content.width + 30 << 0;
		const minLeft = Math.min(parent.left, 0) << 0;
		const left    = parent.left + (anchor.left + anchor.width / 2) / devicePixelRatio - width / 2 + (gecko ? 10 : 3) << 0;
		const maxLeft = parent.width - width << 0;

		(await Windows.update(view.windowId, {
			top, left: Math.min(Math.max(minLeft, left), maxLeft),
			width, height, state: 'normal',
		}));
	} catch (error) { reportError('Fallback mode failed', error); this.view && this.view.close(); } },

	hide() {
		this.view && this.view.close();
	},
};

return {
	add: handleFallback,
};

}); })(this);
