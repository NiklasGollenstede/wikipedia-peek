(function(global) { 'use strict'; const factory = async function wikipediaPeek_plugin() { // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.

const chrome = global.browser || global.chrome;
const gecko = chrome.extension.getURL('').startsWith('moz-');

async function register(loader, getPluginInfo = _getPluginInfo) {

	let port, retry = 5;
	do {
		if (port === null) { (await new Promise(done => global.setTimeout(done, 300))); }
		port = connect();
		if (!(await new Promise(done => {
			port.handlers.connected = () => done(true);
			port.onDisconnect.addListener(() => done(false));
		}))) { port = null; }
	} while (!port && --retry > 0);

	if (!port) { throw new Error(`Could not connect`); }

	port.getPluginInfo = getPluginInfo;
	(await new Promise((resolve, reject) => {
		port.handlers.ready = resolve;
		port.onDisconnect.addListener(() => reject(new Error(`Connection rejected`)));
	}));

	port.handlers.load = loader.load;
	const data = (await port.request('register', loader));
	const options = { __proto__: null, };
	Object.keys(data).forEach(key => Object.defineProperty(options, key, { get() { return data[key]; }, enumerable: true, }));
	Object.values(data).forEach(Object.freeze);

	const onChanged = new Set([ (key, values) => (data[key] = values), ]);
	port.handlers['options.onChanged'] = (key, values) => {
		Object.freeze(values);
		onChanged.forEach(listener => { try { listener(key, values); } catch (error) { console.error(error); } });
	};

	return {
		options: {
			values: options,
			set(key, values) { return port.request('options.set', key, values); },
			onChanged: {
				addListener(listener,) { onChanged.add(listener); },
				hasListener(listener) { return onChanged.has(listener); },
				removeListener(listener) { onChanged.delete(listener); },
			},
		},
		onDisconnect: port.onDisconnect,
	};
}


function connect() {

	const port = chrome.runtime.connect(gecko ? '@wikipedia-peek' : 'anodicdpkdnnolhgebjpobmkjlbkcbnn', { name: 'Plugin.register', });
	port.request = request; port.requests = new Map/*<random, [ resolve, reject, ]>*/;
	const handlers = port.handlers = { __proto__: null, };
	port.onMessage.addListener(onMessage);
	return port;

	async function onMessage([ method, id, args, ]) {
		args = JSON.parse(args);
		if (method === '') { // handle responses
			const threw = id < 0; threw && (id = -id);
			const request = port.requests.get(id); port.requests.delete(id);
			request[+threw](args[0]);
		} else { // handle requests
			if (!handlers[method]) { port.postMessage([ '', -id, [ { message: 'Unknown request', }, ], ]); }
			else if (!id) {
				handlers[method].apply(port, args);
			} else { try {
				const value = (await handlers[method].apply(port, args));
				port.postMessage([ '', +id, JSON.stringify([ value, ]), ]);
			} catch (error) {
				error instanceof Error && (error = { name: error.name, message: error.message, stack: error.stack, });
				port.postMessage([ '', -id, JSON.stringify([ error, ]), ]);
			} }
		}
	}

	function request(method, ...args) { // eslint-disable-line no-unused-vars
		const id = Math.random() * 0x100000000000000;
		port.postMessage([ method, id, JSON.stringify(args), ]);
		return new Promise((resolve, reject) => port.requests.set(id, [ resolve, reject, ]));
	}
}

function _getPluginInfo() {
	const manifest = chrome.runtime.getManifest();
	return {
		title: manifest.name,
		author: manifest.author,
		description: manifest.description,
	};
}


return {
	register,
};

}; if (typeof define === 'function' && define.amd) { define([ ], factory); } else { global[factory.name] = factory(); } })(this);
