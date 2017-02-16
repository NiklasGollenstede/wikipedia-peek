/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals module, */ // license: MPL-2.0
module.exports = function({ /*options, packageJson,*/ manifestJson, files, }) {

	manifestJson.permissions.push(
		'notifications',
		'tabs',
		'webNavigation',
		'*://*/*'
	);

	manifestJson.content_security_policy = `script-src 'self' 'unsafe-eval' 'sha256-QMSw9XSc08mdsgM/uQhEe2bXMSqOw4JvoBdpHZG21ps='; object-src 'self';`; // see common/sandbox.js

	files.node_modules = {
		es6lib: [
			'template.js',
			'concurrent.js',
			'dom.js',
			'functional.js',
			'index.js',
			'namespace.js',
			'network.js',
			'object.js',
			'port.js',
			'require.js',
			'string.js',
		],
		'web-ext-utils': {
			'.': [
				'browser/',
				'loader/',
			],
			options: {
				'.': [ 'index.js', ],
				editor: [
					'about.js',
					'about.css',
					'index.js',
					'index.css',
					'inline.css',
					'inline.html',
					'inline.js',
				],
			},
			update: [
				'index.js',
			],
			utils: [
				'files.js',
				'index.js',
				'inject.js',
				//	'run-in-tab.js',
				'semver.js',
			],
		},
	};

};
