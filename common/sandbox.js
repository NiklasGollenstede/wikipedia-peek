(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/es6lib/port': Port,
	'node_modules/web-ext-utils/browser/': { rootUrl, inContent, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
}) => {

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
	host = document.head,
} = { }) {

	const script = `${ strict ? "'use strict'; " : '' }(async Port => window.addEventListener('message', function onMessage(event) {\
	const port = new Port(event.ports[0], Port.MessagePort); window.removeEventListener('message', onMessage); (${ init })(port);\
	}))((${ require.cache['node_modules/es6lib/port'].factory })());//# sourceURL=${ srcUrl }`;

	if (gecko && !inContent) { // Firefox doesn't allow inline scripts in the extension pages,
		// so the code inside the script itself is allowed by 'sha256-QMSw9XSc08mdsgM/uQhEe2bXMSqOw4JvoBdpHZG21ps=', the eval() needs 'unsafe-eval'
		html += `<script data-code="${ btoa(script) }">eval(atob(document.currentScript.dataset.code))</script></html>`;
	} else {
		html += `<script>${ script }</script></html>`;
	}

	const url = URL.createObjectURL(new Blob([ html, ], { type: 'text/html', }));
	const frame = document.createElement('iframe'); {
		frame.sandbox = sandbox;
		frame.src = url;
	}

	(await new Promise((resolve, reject) => {
		frame.onload = resolve; frame.onerror = reject;
		host.appendChild(frame);
	}));
	URL.revokeObjectURL(url);

	const { port1, port2, } = new MessageChannel;
	frame.contentWindow.postMessage(null, '*', [ port2, ]);
	const port = new Port(port1, Port.MessagePort);

	return Object.assign(port, { frame, });
}

return makeSandbox;

}); })(this);
