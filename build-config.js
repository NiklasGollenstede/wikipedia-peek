/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals module, */ // license: MPL-2.0
module.exports = function({ options, /*packageJson,*/ manifestJson, files, }) {

	manifestJson.permissions.push(
		'contentEval',
		'notifications',
		'tabs',
		'webNavigation',
		'<all_urls>'
	);

	manifestJson.content_security_policy = `script-src 'self' 'unsafe-eval' 'sha256-QMSw9XSc08mdsgM/uQhEe2bXMSqOw4JvoBdpHZG21ps='; object-src 'self';`; // see common/sandbox.js

	manifestJson.browser_action = {
		default_icon: manifestJson.icons,
		default_title: `Toggle ${manifestJson.name}`,
	};

	!options.viewRoot && (options.viewRoot = options.chrome ? 'WikiPeek.html' : 'WikiPeek');

	files.node_modules = {
		es6lib: [
			'network.js',
			'string.js',
		],
		readability: [
			'Readability.js',
		],
		regexpx: [
			'index.js',
		],
		'web-ext-utils': {
			'.': [
				'browser/',
				'lib/pbq/require.js',
				'lib/multiport/index.js',
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
					'inline.js',
				],
			},
			update: [
				'index.js',
			],
			utils: [
				'icons/',
				'event.js',
				'files.js',
				'index.js',
				'semver.js',
			],
		},
	};

};
