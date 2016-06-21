'use strict';

const { PageMod, } = require('sdk/page-mod');
const Prefs = require('sdk/simple-prefs');
const { debounce, } = require('sdk/lang/functional');
const { when: onUnload } = require('sdk/system/unload');

const {
	concurrent: { sleep, },
} = require('es6lib');

const workers = new Set;

const content = new PageMod({
	include: /^https?:\/\/\w{2,20}\.wikipedia\.org\/wiki\/.*$/,
	contentScriptFile: [
		...[
			'require',
			'namespace',
			'object',
			'functional',
			'concurrent',
			'dom',
			'network',
			'index',
		].map(name => './../node_modules/es6lib/'+ name +'.js'),
		'./../content.js',
	],
	attachTo: [ 'top', 'existing', ],
	onAttach(worker) {
		workers.add(worker);
		worker.on('detach', () => workers.delete(worker));
		worker.port.emit('init', Prefs.prefs);
	},
	onError(error) { console.error(error); },
});

onUnload(() => content.destroy());

Prefs.on('', debounce(branch => workers.forEach(({ port, }) => {
	port.emit('prefs/', Prefs.prefs);
	port.emit('prefs/'+ branch, branch);
}), 200));

// require('sdk/tabs').open('https://en.wikipedia.org/wiki/Permian%E2%80%93Triassic_extinction_event');
