(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'common/sandbox': Sandbox,
}) => {

/**
 * Wrapper around a sandboxed iframe that can safely evaluate user input as JavaScript code.
 */
class Evaluator extends Sandbox {

	/**
	 * @param  {function?}   .init       Optional function that does the initial setup inside the sandbox.
	 *                                   Gets re-compiled and called with one end of the Port connection as the only argument.
	 * @param  {properties}  ...options  Other options forwarded to `makeSandbox`.
	 */
	/* async */ constructor({ init, ...options } = { }) { return (async () => { let self; {
		// TODO: could append `options.srcUrl` to `eval`ed scripts
		self = (await super(setup, options));
		(await self.post('init', typeof init === 'function' ? init +'' : null));
	} return self; })(); }

	/**
	 * `eval()`s code in the global scope and returns a JSON clone of the (resolved) value.
	 * @param  {string}  code  Code to execute.
	 * @return {JSON}          Resolved value returned by the evaluated code as a JSON clone.
	 */
	async eval(code) {
		return this.request(':eval', code);
	}

	/**
	 * Creates a `new AsyncFunction` in the sandbox and returns a function stub that calls it.
	 * @param  {...[string]}  args  Arguments forwarded to the function constructor.
	 * @return {async function}     Stub function that calls the function with JSON cloned arguments
	 *                              and asynchronously returns a JSON clone of its return value.
	 *                              @method  destroy  Deletes the remote function.
	 *                              @property  ready  Promise that needs to resolve before the `.length` has a useful value.
	 */
	newFunction(...args) {
		const self = this;
		const id = Math.random().toString(32).slice(2);
		const stub = async function() { return self.request(':F()', id, ...arguments); };
		Object.defineProperty(stub, 'ready', { value: self.request(':new F', id, ...args).then(length => {
			Object.defineProperty(stub, 'length', { value: length, }); return stub;
		}), });
		Object.defineProperty(stub, 'destroy', { value() { try { self.post(':~F', id); } catch (_) { } }, });
		return stub;
	}

}

//// start implementation

function setup(port) {
	const AsyncFunction = (async x=>x).constructor;
	const globEval = eval; // eval in global scope
	const functions = { };
	port.addHandlers({
		async init(code) {
			try { code && (await globEval(code)(port)); }
			finally { port.removeHandler('init'); }
		},
		async ':eval'(code) {
			return globEval(code);
		},
		':new F'(id, ...args) {
			const func = functions[id] = new AsyncFunction(...args);
			return func.length;
		},
		':F()'(id, ...args) {
			const func = functions[id];
			if (!func) { throw new TypeError(`Dead remote function called`); }
			return func(...args);
		},
		':~F'(id) {
			delete functions[id];
		},
	});
}

return Evaluator;

/*
E = await new (await require.async('background/evaluator'))({ init: port => {
	window.openTab = url => port.request('browser.tabs.create', { url, });
}, });
E.addHandlers('browser.tabs.', Browser.tabs);
F = E.newFunction('url', 'openTab(url)'); await F("https://example.com"); F.destroy();
*/


}); })(this);
