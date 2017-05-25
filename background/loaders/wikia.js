(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	'background/loader': { register, },
	'background/utils': { fuzzyFind, article, },
	'common/options': { advanced: { children: advanced, }, },
	module,
}) => { /* global URL, */

const options = register({
	name: module.id.split('/').pop(),
	title: `Wikia.com`,
	description: `Works for Wikia.com and possibly for other pages using their technology.`,

	priority: 1,
	includes: [
		'*://*.wikia.com/wiki/*',
	],

	load,
});
void options;

async function load(url) {
	url = new URL(url);
	const title = url.pathname.replace(/^\/(?:wiki\/)?/, '');
	if (url.search /*|| title.includes(':')*/) { return null; }
	const section = url.hash.slice(1);
	return doLoad('https://'+ url.host +'/api', title, section); // always use https
}

async function doLoad(api, title, section) {

	const thumbPx = advanced.thumb.children.size.value * global.devicePixelRatio;

	title.includes(',') && console.warn(`The title "${ title }" contains commas and may not load correctly`);

	const src = (
		api +'/v1/Articles/Details/?abstract=500' // 500 is max
		+ '&width='+ thumbPx // +'&height='+ thumbPx
		+ '&titles='+ title
	);

	const { response, } = (await HttpRequest({ src, responseType: 'json', }));
	const page = response.items[Object.keys(response.items)[0]]; if (!page) { return null; }
	if (/^REDIRECT ?/.test(page.abstract)) {
		const [ , title, section, ] = (/^(.*?)(?:#.*)?$/).exec(page.abstract.replace(/^REDIRECT ?/, ''));
		return doLoad(api, title, section);
	}

	const thumb = !section && advanced.thumb.value && page.thumbnail && page.original_dimensions && {
		source: page.thumbnail
		.replace(/\/x-offset\/\d+/, '/x-offset/0').replace(/\/window-width\/\d+/, '/window-width/'+ page.original_dimensions.width)
		.replace(/\/y-offset\/\d+/, '/y-offset/0').replace(/\/window-height\/\d+/, '/window-height/'+ page.original_dimensions.height),
		width: thumbPx, height: (page.original_dimensions.height / page.original_dimensions.width * thumbPx) << 0,
	} || { width: 0, height: 0, };
	let html; if (section) {
		const { response, } = (await HttpRequest({ src: `${ api }/v1/Articles/AsSimpleJson?id${ page.id }`, responseType: 'json', }));
		const section = fuzzyFind(response.sections.map(_=>_.title), section.replace(/_/g, ' '));
		html = response.sections.find(_=>_.title === section).content
		.filter(_=>_.type === 'paragraph')
		.map(({ text, }) => `<p>${ text }</p>`).join('');
	} else {
		html = `<p>${ page.abstract }</p>`;
	}

	return article({ html, thumb, });
}

}); })(this);
