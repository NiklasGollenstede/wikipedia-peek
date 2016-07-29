'use strict'; define('common/options', [ // license: MPL-2.0
	'web-ext-utils/chrome',
	'web-ext-utils/options',
], function(
	{ storage: Storage, },
	Options
) {

const model = [
	{
		name: 'thumb',
		title: 'Load thumbnail images',
		type: 'bool',
		default: true,
		children: [
			{
				name: 'size',
				title: 'Thumbnail size',
				suffix: 'px',
				type: 'integer',
				restrict: { type: 'number', from: 40, to: 400, },
				default: 150,
			},
		],
	}, {
		name: 'theme',
		title: 'Info box theme',
		default: 'color: inherit; background-color: inherit; border: 1px solid; border-color: inherit;',
		type: 'menulist',
		options: [
			{ label: 'inherit (default)',    value: 'color: inherit; background-color: inherit; border: 1px solid; border-color: inherit;', },
			{ label: 'black on white',       value: 'color: black;   background-color: white;   border: 1px solid black;', },
			{ label: 'white on blue/grey',   value: 'color: white;   background-color: #343C45; border: 1px solid white;', },
			{ label: 'white on black',       value: 'color: white;   background-color: black;   border: 1px solid white;', },
		],
	}, {
		name: 'fontSize',
		title: 'Info box font-size',
		suffix: '%',
		type: 'integer',
		restrict: { type: 'number', from: 20, to: 300, },
		default: 100,
	}, {
		name: 'relativeWidth',
		title: 'Info box width',
		suffix: '% relative to default',
		type: 'integer',
		restrict: { type: 'number', from: 20, to: 300, },
		default: 100,
	}, {
		name: 'transparency',
		title: 'Info box background transparency',
		suffix: '%',
		type: 'integer',
		restrict: { type: 'number', from: 0, to: 100, },
		default: 0,
	}, {
		name: 'touchMode',
		title: 'Touch Mode',
		description: `If touch mode is enabled, the previews won't show on hover but on the first click/tap on a link, a second click/tap will navigate.
		<br>'Auto detect' will dynamically change modes based on the input method (mouse/touch) you use. If this doesn't work in your browser choose 'Always on/off'`,
		default: 'auto',
		type: 'menulist',
		options: [
			{ label: 'Always off',   value: false, },
			{ label: 'Auto detect',  value: 'auto', },
			{ label: 'Always on',    value: true, },
		],
	}, {
		name: 'showDelay',
		title: 'Show delay',
		description: 'Time you have to hover over a link to load the preview',
		suffix: 'milliseconds',
		type: 'integer',
		restrict: { type: 'number', from: 0, to: 2000, },
		default: 500,
	},
];

const listerners = new WeakMap;

return new Options({
	model,
	prefix: 'options',
	storage: Storage.sync || Storage.local,
	addChangeListener(listener) {
		const onChanged = changes => Object.keys(changes).forEach(key => key.startsWith('options') && listener(key, changes[key].newValue));
		listerners.set(listener, onChanged);
		Storage.onChanged.addListener(onChanged);
	},
	removeChangeListener(listener) {
		const onChanged = listerners.get(listener);
		listerners.delete(listener);
		try {
			Storage.onChanged.removeListener(onChanged);
		} catch (error) { console.error('Failed to remove storage listener', error); }
	},
});

});
