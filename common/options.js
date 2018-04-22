(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { manifest, },
	'node_modules/web-ext-utils/browser/storage': { sync: storage, },
	'node_modules/web-ext-utils/browser/version': { gecko, fennec, },
	'node_modules/web-ext-utils/options/': Options,
}) => {

const isBeta = (/^\d+\.\d+.\d+(?!$)/).test((global.browser || global.chrome).runtime.getManifest().version); // version doesn't end after the 3rd number ==> bata channel

const model = {
	include: {
		title: 'Included Sites',
		description: String.raw`
			This list controls which sites ${ manifest.name } displays previews <i>on</i> by default, without clicking it's icon.<br>
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
			exp: (/^(?:\^\S*\$|<all_urls>|(?:(\*|http|https|file|ftp|app):\/\/(\*|(?:\*\.)?[^\/\*\ ]+|)\/(\S*)))$/i),
			message: `Each pattern must be of the form <scheme>://<host>/<path> or be framed with '^' and '$'`,
		}, },
		input: { type: 'string', default: 'https://*.wikipedia.org/*', },
		children: {
			incognito: {
				default: !gecko, hidden: !gecko, // this is only relevant in Firefox, Chrome has a separate check box for this
				input: { type: 'boolean', suffix: `include Private Browsing windows`, },
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
	style: {
		title: 'Preview Style',
		expanded: false,
		default: true,
		children: {
			color: {
				title: 'Text color',
				default: '#000000',
				restrict: { match: (/^#[0-9a-fA-F]{6}$/), },
				input: { type: 'color', },
			},
			backgroundColor: {
				title: 'Background color',
				default: '#ffffff',
				restrict: { match: (/^#[0-9a-fA-F]{6}$/), },
				input: { type: 'color', },
			},
			fontFamily: {
				title: 'Font',
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
			showFail: {
				title: 'Show Failure',
				description: `Display a cross symbol over links whose previews failed to load`,
				expanded: false,
				default: 'auto',
				input: { type: 'menulist', options: [
					{ label: 'Never',       value: false, },
					{ label: 'When tapped', value: 'auto', },
					{ label: 'Always',      value: true, },
				], },
			},
		},
	},
	advanced: {
		title: 'Advanced',
		expanded: false,
		default: true,
		children: {
			plugins: {
				title: 'Plugins',
				description: `Other Add-ons can act as Plugins for ${ manifest.name } to provide preview data`,
				expanded: false,
				default: true,
				children: {
					allowed: {
						title: 'Allowed Add-ons',
						description: `The Add-ons with the IDs listed below will be allowed to connect to ${ manifest.name } as plugins`,
						maxLength: Infinity,
						default: [ ],
						input: { type: 'string', default: '', },
					},
				},
			},
			thumb: {
				title: 'Thumbnail Images',
				expanded: false,
				default: true,
				input: { type: 'boolean', suffix: `load thumbnails`, },
				children: {
					size: {
						default: 150,
						restrict: { type: 'number', from: 40, to: 400, },
						input: { type: 'integer', prefix: `size`, suffix: 'px', },
					},
				},
			},
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
			excludeAnchor: {
				title: 'Exclude Anchor Elements',
				description: `It is not desirable to show previews for all kinds of links a page can have, therefore exclude link elements that:`,
				expanded: false,
				default: true,
				children: {
					match: {
						description: `<b>Match</b> any of these CSS selectors themselves`,
						maxLength: Infinity,
						default: [ ],
						input: { type: 'string', default: '.no-preview, .no-preview *', },
					},
					contain: {
						description: `<b>Contain</b> an element that matches any of these CSS selectors`,
						maxLength: Infinity,
						default: [ 'img', ],
						input: { type: 'string', default: 'img', },
					},
				},
			},
			showDelay: {
				title: 'Show delay',
				description: `Time you have to hover over a link to load the preview`,
				expanded: false,
				default: 500,
				restrict: { type: 'number', from: 0, to: 2000, },
				input: { type: 'integer', suffix: 'milliseconds', },
			},
			fallback: {
				title: 'Pop-up Fallback Mode',
				description: `The Content Security Policy of some websites prevents the insertion of the panels.
				As a fallback, the previews on these sites can be opened in separate pop-up windows.`,
				expanded: false,
				default: !fennec,
				input: { type: 'checkbox', suffix: 'enable the fallback mode', },
				children: {
					always: {
						description: ` `,
						default: false,
						input: { type: 'checkbox', suffix: `<b>Always</b> use the fallback mode and never display inline panels.
						<br>With the inline panels the pages are theoretically able to tell when and where such a panel is displayed, but can't read its content.
						If you see this as a privacy issue, check this box and all previews will open in undetectable pop-ups.`, },
					},
					offsetTop: {
						description: `The positioning of the pop-ups depends on the width of the window frames, so`,
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
						description: ` `, // margin
						default: true,
						input: { type: 'checkbox', suffix: 'close on blur', },
					},
				},
			},
			devicePixelRatio: {
				title: 'devicePixelRatio',
				description: `Nowadays many devices have high resolution displays.
				To load images in a quality fitting your display and to position the pop-up windows correctly,
				this extension needs to know that scale factor.<br>
				It should automatically adjust itself whenever you open a page belonging to this Add-on`,
				expanded: false,
				default: 1,
				hidden: !gecko,
				restrict: { type: 'number', from: 0.5, to: 8, },
				input: { type: 'number', suffix: 'device pixel per CSS px', },
			},
			resetCache: {
				description: ` `, // margin
				default: Math.random().toString(32).slice(2),
				input: { type: 'random', label: 'Reset Cache', suffix: `Click this button to clear the in-memory cache after you have adjusted Loader Module rules.`, },
			},
		},
	},
	loaders: {
		title: 'Content Loader Modules',
		description: `${ manifest.name } gets the information it displays from a couple of sources.
		<br>This section controls which method to use to get previews for which kind of link.
		For each link encountered on an <i>Included Site</i> ${ manifest.name } will check each loader,
		whose <i>Include Targets</i> match the link, in <i>Priority</i> order high to low.`,
		expanded: true,
		default: true,
		children: 'dynamic',
	},
	fixes: {
		title: 'Page compatibility',
		expanded: false,
		default: [ [ ], ],
		restrict: [
			{ type: 'boolean', },
			{ type: 'string', match: {
				exp: (/^(?:(?:\^\S*\$|<all_urls>|(?:(\*|http|https|file|ftp|app):\/\/(\*|(?:\*\.)?[^\/\*\ ]+|)\/(\S*)))(?:\s+(?!$)|$))*$/i),
				message: `Expected a space separated list of match patterns`,
			}, },
			{ type: 'string', },
		],
		children: {
			wikipedia: Fix({
				title: 'Wikipedia',
				default: [ [ true, 'https://*.wikipedia.org/*', `localStorage.setItem('mwe-popups-enabled', '0');`, ], ],
			}),
			custom: Fix({
				title: 'Custom',
				maxLength: Infinity,
				default: [ ],
			}),
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

function Fix(props) { return Object.assign({
	expanded: false,
	restrict: 'inherit',
	input: [
		{ type: 'boolean', prefix: 'Active  ', style: { display: 'block', marginBottom: '3px', }, default: true, },
		{ type: 'string',  prefix: 'Matches',  style: { display: 'block', marginBottom: '3px', }, default: 'https://example.com/*', },
		{ type: 'code',    prefix: 'Code   ',  default: `// JavaScript code here`, },
	],
}, props); }

return (await new Options({ model, storage, prefix: 'options', })).children;

}); })(this);
