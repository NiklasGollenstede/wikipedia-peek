(function(global) { 'use strict'; prepare() && define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/lib/multiport/': Port,
	'node_modules/web-ext-utils/browser/': { runtime, Storage, },
	'node_modules/web-ext-utils/utils/': { reportError, },
	'background/loader': Loader,
	'common/options': options,
}) => {
let debug; options.debug.whenChange(([ value, ]) => { debug = value; });

const allowedIds = options.advanced.children.plugins.children.allowed;
const queue = prepare.done();

queue.forEach(onConnect);
runtime.onConnectExternal.addListener(onConnect);


async function onConnect(connection) { try {
	const port = new Port(connection, Port.web_ext_Port);
	port.post('connected');
	if (connection.name !== 'Plugin.register') {
		console.warn(`Got external port connection with incorrect name "${ port.name }"`);
		return void port.destroy();
	}

	if (!allowedIds.values.current.includes(connection.sender.id)) {
		(await reportError(`Plugin with ID "${ connection.sender.id }" not allowed`));
		// TODO: ask other end for info, then ask the user if they want to accept
		// const info = (await port.request('getPluginInfo'));
		return void port.destroy();
	}

	port.addHandler(async function register(loader) { try {
		port.removeHandler('register');
		const prefix = `options.loaders.${ loader.name }`;
		const optionsPrefix = prefix +'.advanced.';

		loader.load = port.request.bind(port, 'load');

		const options = (await Loader.register(loader));
		let unloading = false; global.addEventListener('unload', () => { unloading = true; port.destroy(); });
		port.ended.then(() => { if (unloading) { return; } Loader.unregister(options); debug && console.info('Plugin', loader.name, 'disconnected'); });

		port.addHandlers([ Loader.clearCache, Loader.getPreview, ]);

		port.addHandlers('options.', {
			async get(keys) {
				return Storage.sync.get(keys.map(key => prefix + key));
			},
			async set(key, values) {
				let option; try { option = key.split('.').reduce((option, key) => option[key].children, options).parent; }
				catch (error) { console.error(error); throw new TypeError(`Invalid option name ${ key }`); }
				(await option.values.replace(values));
			},
		});

		Storage.onChanged.addListener((change, area) => {
			if (area !== (Storage.sync === Storage.local ? 'local' : 'sync')) { return; }
			Object.keys(change).forEach(key => key.startsWith(optionsPrefix) && port.post('options.onChanged', key.slice(optionsPrefix.length), change[key].newValue));
		});

		const data = { }; (function add(option) {
			data[option.path.split('.').slice(3).join('.')] = option.values.current;
			option.children.forEach(add);
		})(options.parent); delete data[''];

		debug && console.info('Plugin', loader.name, 'connected');

		return data;

	} catch (error) { reportError(error); global.setTimeout(() => port.destroy()); throw error; } });

	(await port.request('ready'));

} catch (error) { reportError(error); connection.disconnect(); } }


}); function prepare() { // end define

// enqueue all ports that connect before this module is ready
const queue = [ ], onConnect = port => queue.push(port);

const event = (global.browser || global.chrome).runtime.onConnectExternal;
if (!event) { define({ }); return false; }

event.addListener(onConnect);
prepare.done = () => (event.removeListener(onConnect), queue);

return true;

} })(this);
