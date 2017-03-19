(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { Tabs, Windows, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/loader/views': Views,
	'node_modules/web-ext-utils/utils/': { reportError, },
	'common/options': options,
	'common/sandbox': makeSandbox,
	'content/panel.js': js,
	'content/panel.html': html,
	require,
}) => {

const offsetTop = options.advanced.children.fallback.children.offsetTop.children;
const closeOnBlur = options.advanced.children.fallback.children.closeOnBlur;
const style = options.style.children;
function getStyle() { return {
	color: style.color.value,
	fontFamily: style.fontFamily.value,
	fontSize: style.fontSize.value,
	backgroundColor: style.backgroundColor.value,
	transparency: style.transparency.value,
}; }

let view = null, getView = null;

Views.setHandler(function fallback(view) {
	getView ? getView(view) : view.close();
});

const methods = {
	async show(preview, anchor) { try {
		// TODO: the tab based fallback mode has one serious conceptional flaw: it is virtually impossible to actually click the original link. And it is too slow (on a phone)
		const tab = Windows ? (await Windows.create({
			type: 'popup', url: '/view.html#fallback',
			width: 50, height: 50,
		})).tabs[0] : (await Tabs.create({
			url: '/view.html#fallback',
			[!gecko ? 'openerTabId' : 'index']: this.tab.id,
			index: (await Tabs.get(this.tab.id)).index,
		}));
		view = (await new Promise(got => (getView = got)));
		view.tabId = tab.id;
		if (!view.document.hasFocus()) { return void methods.hide(); }

		closeOnBlur.value && view.addEventListener('blur', async () => view && (!view.port || !(await view.port.request('isHovered'))) && methods.hide());
		view.addEventListener('unload', () => { view && view.port && view.port.destroy(); view = view.port = null; });
		view.document.title = `Fallback - Wikipedia Peek`;

		const port = view.port = (await makeSandbox(js, {
			html: html,
			srcUrl: require.toUrl('content/panel.js'),
			host: view.document.body, // needs to reside in the view, otherwise firefox won't give the elements any dimensions
		}));
		Object.assign(port.frame.style, {
			display: '', position: 'fixed',
			border: 'none', top: 0, left: 0,
			width: 'calc(100vw + 2px)', height: 'calc(100vh + 2px)',
		});
		Windows && port.addHandler(setSize);
		!Windows && closeOnBlur.value && port.request('await', 'click').then(methods.hide).catch(() => 0);

		(await port.request('setStyle', getStyle(), true));
		const parent  = Windows && (await Windows.get((await Tabs.get(this.tab.id)).windowId));
		const content = (await port.request('show', preview, parent ? parent.width - 20 : 999999));
		Windows && (await setSize(content));
		if (!view.document.hasFocus()) { return void methods.hide(); }

		async function setSize(content) {
			if (gecko && content.dpr && content.dpr !== global.devicePixelRatio)
			{ global.devicePixelRatio = options.advanced.children.devicePixelRatio.value = content.dpr; }
			const addTop  = offsetTop[parent.state].value;
			const height  = Math.min((content.scrollHeight + 40), parent.height - addTop - anchor.top / global.devicePixelRatio) <<0;
			const width   = content.scrollWidth + 30 <<0;
			const top     = parent.top + addTop + anchor.top / global.devicePixelRatio <<0;
			const left    = parent.left + Math.min(Math.max(0,
				(anchor.left + anchor.width/2) / global.devicePixelRatio - width/2 + (gecko ? 10 : 3)
			), parent.width - width) <<0;

			(await Windows.update(tab.windowId, {
				top, left, width, height, state: 'normal',
			}));
		}

		(await port.ended);
	} catch (error) { reportError('Fallback mode failed', error); methods.hide(); throw error; } },

	hide() {
		view && Tabs.remove(view.tabId);
		view = null;
	},

	isHovered() { return view && view.port && view.port.request('isHovered'); },
};

return methods;

}); })(this);
