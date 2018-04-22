(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/lib/multiport/': Port,
	'node_modules/web-ext-utils/browser/': { rootUrl, inContent, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	require,
}) => { /* global URL, Blob, btoa, */

/**
 * Creates a sandboxed iframe and returns a es6lib/Port connected to it.
 * @param  {function}  init              Function that does the initial setup inside the sandbox.
 *                                       Gets re-compiled and called with one end of the Port connection as the only argument.
 * @param  {object}    options           Optional Object with all optional properties to customize the sandbox.
 * @param  {string}    options.html      Custom HTML for the frame, must not include the closing `</html>` tag.
 * @param  {Boolean}   options.strict    Whether to include a global 'use strict' directive. Defaults to true.
 * @param  {string}    options.srcUrl    Logical URL of `init` for debugging and stack traces.
 * @param  {String}    options.sandbox   Custom value for the `sandbox` attribute of the iframe. Defaults to `"allow-scripts"`.
 * @param  {Element}   options.host      Element to attach the frame to. Defaults to `document.head`.
 * @return {Port}                        es6lib/Port instance with `.frame` as additional property.
 */
async function makeSandbox(init, {
	html = `<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body></body>`, // without </html>,
	strict = true,
	srcUrl = rootUrl +'eval',
	sandbox = 'allow-scripts',
	host = global.document.head,
} = { }) {

	const script = `${ strict ? "'use strict';" : '' } \0
		document.currentScript.remove(); \0
		(Port => window.onmessage = ({ ports: [ port1, ], }) => { \0
			port1.postMessage([ 'loaded', 0, [ ], ]); \0
			const port = new Port(port1, Port.MessagePort); \0
			window.onmessage = null; port1 = null; \0
			(${ init })(port); \0
		})((function(global) { 'use strict'; return (${ require.cache['node_modules/web-ext-utils/lib/multiport/index'].factory })(); })(window));
	//# sourceURL=${ srcUrl }\n`.replace(/ \0[\r\n]\s*/g, ' ');

	if (!inContent) { // Firefox doesn't allow inline scripts in the extension pages,
		// so the code inside the script itself is allowed by 'sha256-QMSw9XSc08mdsgM/uQhEe2bXMSqOw4JvoBdpHZG21ps=', the eval() needs 'unsafe-eval'
		html += `<script data-code="${ btoa(script) }">eval(atob(document.currentScript.dataset.code))</script></html>`;
	} else {
		html += `<script>${ script }</script></html>`;
	}

	const url = URL.createObjectURL(new Blob([ html, ], { type: 'text/html', }));
	const frame = host.ownerDocument.createElement('iframe'); {
		frame.sandbox = sandbox;
		frame.src = url;
		frame.style.display = 'none';
	}

	return new Promise((resolve, reject) => {
		frame.onload = () => resolve(onload()); frame.onerror = reject;
		host.appendChild(frame);
		URL.revokeObjectURL(url);
		// if the page listens for 'DOMNodeInserted' (deprecated) and then does a synchronous XHR (deprecated) it can actually read the contents of the Blob.
		// the only way this could be prevented would be to listen for 'DOMNodeInserted' earlier and cancel the event
		async function onload() {
			frame.onload = frame.onerror = null;

			const { port1, port2, } = new host.ownerDocument.defaultView.MessageChannel;
			frame.contentWindow.postMessage(null, '*', [ port1, ]);
			// nobody but the frame content itself can listen to this
			const port = new Port(port2, Port.MessagePort);

			return new Promise((resolve, reject) => {
				let done = false; waitIdleTime(inContent ? (gecko ? 250 : 125) : 1000).then(() => !done && reject(new Error('Failed to create Sandbox')));
				port.addHandler(function loaded() {
					port.removeHandler('loaded');
					resolve(Object.assign(port, { frame, }));
					done = true;
				});
			});
		}
	}).catch(error => { frame.remove(); throw error; });
}

return makeSandbox;

/* global performance, requestIdleCallback, setTimeout, */
function waitIdleTime(time) { return new Promise(done => {
	const start = performance.now();
	if (typeof requestIdleCallback !== 'function') {
		return void setTimeout(function loop() {
			if ((time -= 5) <= 0) { done(performance.now() - start); }
			else { setTimeout(loop, 5); }
		}, 5);
	}
	requestIdleCallback(function loop(idle) {
		const left = Math.max(5, idle.timeRemaining()); time -= left;
		if (time <= 0) { done(performance.now() - start); }
		else { setTimeout(() => requestIdleCallback(loop), left + 1); }
	});
}); }

}); })(this);
