(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
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

	let doc; try { doc = (await (await fetch(url)).text()); }
	catch (_) { console.error(_); return null; }
	const [ head, body, ] = doc.split(/<\/head>\s*<body/);

	let thumb; thumb: {
		let source = ((/<meta\s+property=(["'])og:image\1\s+content=(["'])(.*?)\2\s*\/?>/).exec(head) || [ ])[3];
		const match = (/_V1_U[XY]\d+_CR(\d+),0,(\d+),(\d+)_AL_\.jpg/).exec(source || ''); if (!match) { break thumb; }
		const area = (advanced.thumb.children.size.value * global.devicePixelRatio * 1.5) ** 2;
		const ratio = Math.max(2/3, match[2] / match[3]), height = ((area / ratio) ** .5)|0, width = (height * ratio)|0;
		const offset = match[1] * height / match[3];
		source = source.replace(match[0], `_V1_UY${height}_CR${offset},0,${width},${height}_AL_.jpg`);
		thumb = { source, width, height, };
	}
	const title = ((/<meta\s+property=(["'])og:title\1\s+content=(["'])(.*?)\2\s*\/?>/).exec(head) || [ ])[3];
	// const date = ((/<time datetime.{0,128}<\/time>/).exec(body) || [ '', ])[0].replace(/<.*?>/g, '');
	const description = ((/<meta\s+property=(["'])og:description\1\s+content=(["'])(.*?)\2\s*\/?>/).exec(head) || [ ])[3];
	if (!description) { return null; }
	const bioInfo = getContent(body, (/id="name-born-info"[^]*?<\/div>/));
	const titleInfo = getContent(body, (/class="subtext"[^]*?<\/div>/));
	const html = [
		title && `<p><b>${ title }</b></p>`,
		bioInfo && bioInfo.length < 150 && `<p><i>${ bioInfo }</i></p>`,
		titleInfo && titleInfo.length < 150 && `<p><i>${ titleInfo }</i></p>`,
		`<span>${ description }</span>`,
	].filter(_=>_).join('\n');

	return article({ html, thumb, });
}

function getContent(html, exp) { return (exp.exec(html) || [ '', ])[0].replace(/(?:^|<)[^]*?>/g, '').replace(/\s+/g, ' ').trim(); }

}); })(this);
