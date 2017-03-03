(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { inContent, },
	'node_modules/web-ext-utils/browser/version': { gecko, fennec, },
	'node_modules/web-ext-utils/options/': Options,
	require,
}) => {

const isBeta = (/^\d+\.\d+.\d+(?!$)/).test((global.browser || global.chrome).runtime.getManifest().version); // version doesn't end after the 3rd number ==> bata channel

const model = {
	include: {
		title: 'Included Sites',
		description: String.raw`
			A list of sites on which this extension should work by default, without clicking it's icon.<br>
			Specify as <a href="https://developer.mozilla.org/Add-ons/WebExtensions/Match_patterns">Match Patterns</a>
			or <a href="https://regex101.com/">Regular Expressions</a> (advanced, must start with <code>^</code> and end with <code>$</code>).<br>
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
		default: [ 'https://*.wikipedia.org/*', 'https://*.mediawiki.org/*', 'https://*.wikia.com/*', '<all_urls>', ],
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
			fallback: {
				title: 'Popup Fallback Mode',
				description: `The Content Security Policy of some websites prevents the insertion of the panels.
				As a fallback, the previews on these sites can be opened in separate popup windows.`,
				expanded: false,
				default: !fennec,
				input: { type: 'checkbox', suffix: 'enable the fallback maode', },
				children: {
					always: {
						description: ` `,
						default: false,
						input: { type: 'checkbox', suffix: `<b>Always</b> use the fallback mode and never display inline panels.
						<br>With the inline panels the pages are theoretically able to tell when and where such a panel is displayed, but can't read its content.
						If you see this as a privacy issue, check this box and all previews will open in undetectable popups.`, },
					},
					offsetTop: {
						description: `The positioning of the popups depends on the width of the window frames, so`,
						restrict: { type: 'number', from: 0, to: 250, },
						default: true,
						children: {
							maximized: {
								default: gecko ? 74 : 83,
								restrict: 'inherit',
								input: { type: 'number', prefix: 'add', suffix: 'pixel at the top of maximized windows,', },
							},
							normal: {
								default: gecko ? 68 : 88,
								restrict: 'inherit',
								input: { type: 'number', prefix: 'and', suffix: 'pixel at the top of other windows.', },
							},
						},
					},
					closeOnBlur: {
						description: ` `,
						default: true,
						input: { type: 'checkbox', suffix: 'close on blur', },
					},
				},
			},
			resetCache: {
				title: 'Reset Cache',
				default: Math.random().toString(32).slice(2),
				input: { type: 'random', label: 'Reset', },
			},
			devicePixelRatio: {
				title: 'devicePixelRatio',
				description: `Nowadays many devices have high resolution displays.
				To load images in a quality fitting your display and to position the popup windows correctly,
				this extension needs to know that scale factor.<br>
				It should automatically adjust itself and unless you have zoomed this page, the value should be set to <code>${ devicePixelRatio }</code>.`,
				expanded: false,
				default: 1,
				hidden: !gecko,
				restrict: { type: 'number', from: 0.5, to: 8, },
				input: { type: 'number', suffix: 'device pixel per CSS px', },
			},
		},
	},
	debug: {
		title: 'Debug Level',
		expanded: false,
		default: +isBeta,
		hidden: !isBeta,
		restrict: { type: 'number', from: 0, to: 2, },
		input: { type: 'integer', suffix: 'set to > 0 to enable debugging', },
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
