(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/regexpx/': RegExpX,
	'background/utils': { article, },
	'background/loader': { register, },
	'common/options': { advanced: { children: advanced, }, },
	module,
}) => { /* global fetch, */

const options = register({
	name: module.id.split('/').pop(),
	title: `IMDb`,
	description: `.`,

	priority: 1,
	includes: [
		'*://www.imdb.com/title/tt*',
		'*://www.imdb.com/name/nm*',
	],

	load,
});
void options;

async function load(url) {

	let head; try { head = (await (await fetch(url)).text()).replace(/<\/head>[^]*/, ''); }
	catch (_) { console.error(_); return null; }

	let thumb; thumb: {
		let source = ((/<meta\s+property=(["'])og:image\1\s+content=(["'])(.*?)\2\s*\/?>/).exec(head) || [ ])[3];
		const match = (/_V1_U[XY]\d+_CR(\d+),0,(\d+),(\d+)_AL_\.jpg/).exec(source || ''); if (!match) { break thumb; }
		const area = (advanced.thumb.children.size.value * global.devicePixelRatio) ** 2;
		const ratio = Math.max(2/3, match[2] / match[3]), height = ((area / ratio) ** .5)|0, width = (height * ratio)|0;
		const offset = match[1] * height / match[3];
		source = source.replace(match[0], `_V1_UY${height}_CR${offset},0,${width},${height}_AL_.jpg`);
		thumb = { source, width, height, };
	}
	const title = ((/<meta\s+property=(["'])og:title\1\s+content=(["'])(.*?)\2\s*\/?>/).exec(head) || [ ])[3];
	let html = ((/<meta\s+property=(["'])og:description\1\s+content=(["'])(.*?)\2\s*\/?>/).exec(head) || [ ])[3]; html: {
		if (!title) { break html; } if (!html) { return null; }
		const titleAt = html.search(RegExpX('i')`${ title }`); if (titleAt >= 0) {
			html = '<span>'+ html.slice(0, titleAt) +'<b>'
				+ html.slice(titleAt, titleAt + title.length)
			+'</b>'+ html.slice(titleAt + title.length) +'</span>';
		} else {
			html = `<p><b>${ title }</b></p><span>${ html }</span>`;
		}
	}

	return article({ html, thumb, });
}

}); })(this);
