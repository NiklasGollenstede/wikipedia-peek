(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/options/': Options,
}) => {

return new Options({ model: {
	thumb: {
		title: 'Load thumbnail images',
		default: true,
		input: { type: 'bool', },
		children: [
			{
				name: 'size',
				title: 'Thumbnail size',
				default: 150,
				restrict: { type: 'number', from: 40, to: 400, },
				input: { type: 'integer', suffix: 'px', },
			},
		],
	},
	theme: {
		title: 'Info box theme',
		default: 'color: inherit; background-color: inherit; border: 1px solid; border-color: inherit;',
		input: { type: 'menulist', options: [
			{ label: 'inherit (default)',    value: 'color: inherit; background-color: inherit; border: 1px solid; border-color: inherit;', },
			{ label: 'black on white',       value: 'color: black;   background-color: white;   border: 1px solid black;', },
			{ label: 'white on blue/gray',   value: 'color: white;   background-color: #343C45; border: 1px solid white;', },
			{ label: 'white on black',       value: 'color: white;   background-color: black;   border: 1px solid white;', },
		], },
	},
	fontSize: {
		title: 'Info box font-size',
		default: 100,
		restrict: { type: 'number', from: 20, to: 300, },
		input: { type: 'integer', suffix: '%', },
	},
	relativeWidth: {
		title: 'Info box width',
		default: 100,
		restrict: { type: 'number', from: 20, to: 300, },
		input: { type: 'integer', suffix: '% relative to default', },
	},
	transparency: {
		title: 'Info box background transparency',
		default: 0,
		restrict: { type: 'number', from: 0, to: 100, },
		input: { type: 'integer', suffix: '%', },
	},
	touchMode: {
		title: 'Touch Mode',
		description: `If touch mode is enabled, the previews won't show on hover but on the first click/tap on a link, a second click/tap will navigate.
		<br>'Auto detect' will dynamically change modes based on the input method (mouse/touch) you use. If this doesn't work in your browser choose 'Always on/off'`,
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
		default: 500,
		restrict: { type: 'number', from: 0, to: 2000, },
		input: { type: 'integer', suffix: 'milliseconds', },
	},
}, });

}); })(this);
