(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { inContent, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	'node_modules/web-ext-utils/options/': Options,
}) => {

const model = {
	include: {
		title: 'Included Sites',
		description: String.raw`
			A list of sites on which this extension should work by default, without clicking it's icon.<br>
			Specify as <a href="https://developer.mozilla.org/Add-ons/WebExtensions/Match_patterns">Match Patterns</a> or Regular Expressions (advanced).<br>
			Examples:<ul>
				<li><code>https://*.wikipedia.org/*</code>: Matches all Wikipedia pages</li>
				<li><code>https://www.whatever.web/sites.html</code>: Matches exactly that site</li>
				<li><code>&lt;all_urls&gt;</code>: Matches every URL</li>
				<li><code>^https?://(?:www\.)?google\.(?:com|co\.uk|de|fr|com\.au)/.*$</code>: Starting with <code>^</code> and ending with <code>$</code>, this is a Regular Expression.</li>
				<li><code>^.*$</code>: This is a Regular Expressions too. This one matches everything, so really only use it if you understand what you are doing!</li>
			</ul>
		`,
		expanded: false,
		maxLength: Infinity,
		default: [ 'https://*.wikipedia.org/*', 'https://*.mediawiki.org/*', 'https://*.wikia.com/*', ],
		restrict: { match: {
			exp: (/^(?:\^.*\$|<all_urls>|(?:(\*|http|https|file|ftp|app):\/\/(\*|(?:\*\.)?[^\/\*\ ]+|)\/([^\ ]*)))$/i),
			message: `Each pattern must be of the form <scheme>://<host>/<path> or be framed with '^' and '$'`,
		}, },
		input: { type: 'string', default: 'https://*.wikipedia.org/*', },
		children: {
			incognito: {
				default: !gecko, hidden: !gecko, // this is only relevant in Firefox, Chrome has a separate check box for this
				input: { type: 'bool', suffix: `include Private Browsing windows`, },
			},
			exclude: {
				title: 'Excluded Sites',
				description: `Use the same syntax as to exclude sites that are matched by Included Sites above`,
				restrict: 'inherit',
				maxLength: Infinity,
				input: { type: 'string', default: 'https://specific.site.to/exclude/*', },
			},
		},
	},
	thumb: {
		title: 'Thumbnail Images',
		expanded: false,
		default: true,
		input: { type: 'bool', suffix: `load thumbnails`, },
		children: [
			{
				name: 'size',
				default: 150,
				restrict: { type: 'number', from: 40, to: 400, },
				input: { type: 'integer', prefix: `size`, suffix: 'px', },
			},
		],
	},
	style: {
		title: `Preview Style`,
		expanded: false,
		default: true,
		children: {
			color: {
				title: `Text color`,
				default: '#000000',
				restrict: { match: (/^#[0-9a-fA-F]{6}$/), },
				input: { type: 'color', },
			},
			backgroundColor: {
				title: `Background color`,
				default: '#ffffff',
				restrict: { match: (/^#[0-9a-fA-F]{6}$/), },
				input: { type: 'color', },
			},
			fontFamily: {
				title: `Font`,
				default: 'Arial, Sans-Serif',
				restrict: { match: { exp: (/^\s*(?:".+"|[\w-]+)(\s*,\s*(?:".+"|[\w-]+))*\s*$/), message: `This must be a valid CSS font family definition`, }, },
				input: { type: 'string', },
			},
			fontSize: {
				title: 'Info box font-size',
				default: 100,
				restrict: { type: 'number', from: 20, to: 300, },
				input: { type: 'integer', suffix: '%', },
			},
			transparency: {
				title: 'Info box background transparency',
				default: 0,
				restrict: { type: 'number', from: 0, to: 100, },
				input: { type: 'integer', suffix: '%', },
			},
			width: {
				title: 'Info box width',
				default: 100,
				restrict: { type: 'number', from: 20, to: 300, },
				input: { type: 'integer', suffix: '% relative to default', },
			},
		},
	},
	advanced: {
		title: `Advanced`,
		expanded: false,
		default: true,
		children: {
			touchMode: {
				title: 'Touch Mode',
				description: `If touch mode is enabled, the previews won't show on hover but on the first click/tap on a link, a second click/tap will navigate.
				<br>'Auto detect' will dynamically change modes based on the input method (mouse/touch) you use. If this doesn't work in your browser choose 'Always on/off'`,
				expanded: false,
				default: 'auto',
				input: { type: 'menulist', options: [
					{ label: 'Always off',   value: false, },
					{ label: 'Auto detect',  value: 'auto', },
					{ label: 'Always on',    value: true, },
				], },
			},
			showDelay: {
				title: 'Show delay',
				description: 'Time you have to hover over a link to load the preview',
				expanded: false,
				default: 500,
				restrict: { type: 'number', from: 0, to: 2000, },
				input: { type: 'integer', suffix: 'milliseconds', },
			},
			resetCache: {
				title: 'Reset Cache',
				default: Math.random().toString(32).slice(2),
				input: { type: 'random', label: 'Reset', },
			},
		},
	},
};

if (!inContent) {
	const children = { };
	model.loaders = {
		title: `Content Loader Modules`,
		expanded: false,
		default: true,
		children: children,
	};
	const loaders = (await Promise.all(
		(await require.async('node_modules/web-ext-utils/utils/files')).readDir('background/loaders')
		.map(name => require.async('background/loaders/'+ name.slice(0, -3)))
	)).sort((a, b) => b.priority - a.priority);

	for (const loader of loaders) {
		const { name, } = loader;
		children[name] = {
			title: loader.title,
			description: loader.description,
			expanded: false,
			default: true,
			children: {
				priority: {
					default: loader.priority,
					restrict: { type: 'number', },
					input: { type: 'number', prefix: 'Priority:', suffix: 'If multiple loaders match, the ones with higher priority will be used first.', },
				},
				includes: {
					title: 'Include Targets',
					description: `List of include patterns (see Included Sites) matching URLs for which this loader will be considered`,
					maxLength: Infinity,
					default: loader.includes,
					restrict: { unique: '.', match: {
						exp: (/^(?:\^.*\$|<all_urls>|(?:(\*|http|https|file|ftp|app):\/\/(\*|(?:\*\.)?[^\/\*\ ]+|)\/([^\ ]*)))$/i),
						message: `Each pattern must be of the form <scheme>://<host>/<path> or be framed with '^' and '$'`,
					}, },
					input: { type: 'string', default: '', },
				},
			},
		};
		loader.options && (children[name].children.options = {
			title: 'Advanced',
			expanded: false,
			default: true,
			children: loader.options,
		});
		Object.defineProperty(children[name], 'loader', { value: loader, }); // avoid freezing
	}
}

const options = (await new Options({ model, }));
try {
	require('node_modules/web-ext-utils/loader/content')
	.onUnload.addListener(() => options.destroy());
} catch (_) { /* not in content */ }
return options.children;

}); })(this);
