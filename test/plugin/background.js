this.wikipediaPeek_plugin.then(async function main(Loader) { 'use strict';

const plugin = (await Loader.register({
	name: 'pluginTest',
	title: `Plugin Test`,
	description: `Just to test external plugins.`,

	priority: 999,
	includes: [ '<all_urls>', ],
	options: {
		message: {
			title: 'message',
			default: [ 'some strings', ],
			input: { type: 'string', },
		},
		foo: {
			title: 'BAR',
			default: 'bar',
			input: { type: 'string', },
			children: {
				baz: {
					title: 'BAZ',
					default: 42,
					input: { type: 'number', },
				},
			},
		},
	},

	load(url) {
		return `External loader test result for <a href="${ url }" target="_top">${ url }</a>
		Current message is "${ plugin.options.values.message[0] }"`;
	},
}));
console.info('plugin connected');

plugin.onDisconnect.addListener(() => {
	console.info('plugin disconnected');
	main(Loader);
});

});
