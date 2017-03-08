(function() { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/network': { HttpRequest, },
	module,
}) => {

const Self = {
	name: module.id.split('/').pop(),
	title: `xkcd.com`,
	description: ``,

	priority: 1,
	includes: [ String.raw`^https?://xkcd\.com/\d+/$`, ],

	async load(url) {
		url = url.replace(/^https?:/, 'https:');

		const { response, } = (await HttpRequest({ url, responseType: 'text', }));

		let img = (/id="comic">\s*(<img.*?>)/).exec(response);
		if (!img) { return null; } img = img[1];

		const hd = (/srcset=".*?([^ ]*?) 2x/).exec(img);
		hd && (img = img.replace(/src="[^"]*/, () => 'src="'+ hd[1]));

		/*<style>img { position: fixed; left: 4px; top: 4px; }</style>*/
		return `
			<base href=${ JSON.stringify(url) }>
			<style>
				#content { padding: 0 0 6px 0; text-align: center; }
				img { padding: 4px 5px 0 4px; }
			</style>
			<div id="comic">${ img }</div>
			<script>(`+ (() => {
				document.body.classList.add('loading');
				const img = document.querySelector('#comic img');
				img.addEventListener('load', async () => {
					document.body.classList.remove('loading');
					const width = img.naturalWidth  / devicePixelRatio;
					img.style.width = width  +'px';
					img.insertAdjacentHTML('afterend', img.title);
					img.title = ''; // at least in chrome
					(await window.resize());
					setTimeout(() => window.resize(), 10);
				});
			}) +`)();</script>
		`.replace(/^\t{3,4}/gm, '');
	},
};

return Self;

}); })();
