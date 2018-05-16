(function(global) { 'use strict'; define(({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/lib/multiport/': Port,
	'node_modules/web-ext-utils/browser/': { rootUrl, inContent, },
	'node_modules/web-ext-utils/browser/version': { gecko, },
	options, require,
}) => { /* global URL, Blob, btoa, */

/**
 * A Port connected to a sandboxed iframe.
 * @property {Element}  frame  The iframe element that was added to the DOM.
 */
class Sandbox extends Port {

	/**
	 * Creates a sandboxed iframe and returns a es6lib/Port connected to it.
	 * @param  {function}    init      Function that does the initial setup inside the sandbox.
	 *                                 Gets re-compiled and called with one end of the Port connection as the only argument.
	 * @param  {string?}    .html      Custom HTML for the frame, must not include the closing `</html>` tag.
	 * @param  {string?}    .srcUrl    Logical URL of `init` for debugging and stack traces.
	 * @param  {string?}    .sandbox   Custom value for the `sandbox` attribute of the iframe. Defaults to `"allow-scripts"`.
	 * @param  {Element?}   .host      Element to attach the frame to. Defaults to `document.head`.
	 */
	/* async */ constructor(init, {
		html = `<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"></head><body></body></html>`,
		srcUrl = rootUrl +'eval',
		sandbox = 'allow-scripts',
		host = global.document.head,
		timeout,
	} = { }) { return (async () => { {
		const frame = createFrame(init, html, srcUrl, sandbox, host); try {

			(await new Promise((load, error) => {
				frame.onload = load; frame.onerror = error;
				host.appendChild(frame);
				gecko && !debug && URL.revokeObjectURL(frame.src); // revoke as soon as possible (but not in chrome, where that would be too early ...)
				// if the page listens for 'DOMNodeInserted' (deprecated) and then does a synchronous XHR (deprecated) it can actually read the contents of the Blob.
				// the only way this could be prevented would be to listen for 'DOMNodeInserted' earlier and cancel the event
			}));
			!gecko && !debug && URL.revokeObjectURL(frame.src);

			frame.onload = frame.onerror = null;

			const { port1, port2, } = new host.ownerDocument.defaultView.MessageChannel;
			frame.contentWindow.postMessage(null, '*', [ port1, ]); // only the frame content can receive this
			super(port2, Port.MessagePort); this.frame = frame;

			(await new Promise((loaded, failed) => {
				const done = setIdleTimeout(
					() => failed(new Error('Failed to create Sandbox')),
					timeout || (inContent ? (gecko ? 250 : 125) : 1000),
				);
				this.addHandler('loaded', () => {
					this.removeHandler('loaded');
					done(); loaded();
				});
			}));

		} catch (error) { frame.remove(); throw error; }
	} return this; })(); }

	destroy() {
		this.frame && this.frame.remove(); this.frame = null;
		super.destroy();
	}
}

//// start implementation


let debug; options.debug.whenChange(([ value, ]) => { debug = value; });

const PortCode = `(function(global) { 'use strict'; return (${
	require.cache['node_modules/web-ext-utils/lib/multiport/index'].factory
})(); })(window)`;

function createFrame(init, html, srcUrl, sandbox, host) {
	let script = [
		`document.currentScript.remove();`,
		`(Port => window.onmessage = ({ ports: [ port1, ], }) => {`,
			`port1.postMessage([ 'loaded', 0, [ ], ]);`,
			`const port = new Port(port1, Port.MessagePort);`,
			`window.onmessage = null; port1 = null;`,
			`(${ init })(port);`,
		`})(${ PortCode });`,
		`//# sourceURL=${ srcUrl }\n`,
	].join(' ');

	if (!inContent) { // Firefox doesn't allow inline scripts in the extension pages,
		// so the code inside the script itself is allowed by 'sha256-QMSw9XSc08mdsgM/uQhEe2bXMSqOw4JvoBdpHZG21ps=', the eval() needs 'unsafe-eval'
		script = `<script data-code="${ btoa(script) }">eval(atob(document.currentScript.dataset.code))</script>`;
	} else {
		script = `<script>${ script }</script>`;
	}
	html = html.replace(rHtmlEnd, script + '</html>');

	const url = URL.createObjectURL(new Blob([ html, ], { type: 'text/html', }));
	const frame = host.ownerDocument.createElement('iframe'); {
		frame.sandbox = sandbox;
		frame.src = url;
		frame.style.display = 'none';
	} return frame;
}

let rHtmlEnd; try { rHtmlEnd = new RegExp(String.raw`(?<!<!--(?!.*-->).*)<\/html>|$`); }
catch (_) { rHtmlEnd = (/<\/html>|$/); } // lookbehind not supported yet

return Sandbox;

/* global performance, requestIdleCallback, setTimeout, */
function setIdleTimeout(callback, time) {
	const start = performance.now(); let canceled = false;
	requestIdleCallback(function loop(idle) {
		if (canceled) { return; }
		const left = Math.max(5, idle.timeRemaining()); time -= left;
		if (time <= 0) { callback(performance.now() - start); }
		else { setTimeout(() => requestIdleCallback(loop), left + 1); }
	});
	return function cancel() { canceled = true; };
}

}); })(this);
