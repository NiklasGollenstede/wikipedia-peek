'use strict'; define('common/options', [ // license: MPL-2.0
	'web-ext-utils/chrome',
	'web-ext-utils/options',
], function(
	{ storage: Storage, },
	Options
) {

const defaults = [
	{
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
		unit: '%',
		type: 'integer',
		restrict: { type: 'number', from: 20, to: 300, },
		default: 100,
	}, {
		name: 'relativeWidth',
		title: 'Info box width',
		unit: '% relative to default',
		type: 'integer',
		restrict: { type: 'number', from: 20, to: 300, },
		default: 100,
	}, {
		name: 'transparency',
		title: 'Info box transparency',
		unit: '%',
		type: 'integer',
		restrict: { type: 'number', from: 0, to: 100, },
		default: 0,
	}, {
		name: 'showDelay',
		title: 'Show delay',
		description: 'time you have to hover over a link to load the preview',
		unit: 'milliseconds',
		type: 'integer',
		restrict: { type: 'number', from: 0, to: 2000, },
		default: 500,
	},
];

const listerners = new WeakMap;

return new Options({
	defaults,
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
		Storage.onChanged.removeListener(onChanged);
	},
});

});
