/*eslint strict: ["error", "global"], no-implicit-globals: "off"*/ 'use strict'; /* globals module, */ // license: MPL-2.0
module.exports = function({ /*options, packageJson,*/ manifestJson, files, }) {

	manifestJson.permissions.push(
		'notifications',
		'tabs',
		'webNavigation',
		'*://*/*'
	);

	delete manifestJson.browser_action;

	manifestJson.content_scripts = [ {
		matches: [
			'*://*.wikipedia.org/*',
			'*://*.mediawiki.org/*',
			'*://*.wikia.com/*',
		],
		match_about_blank: false,
		all_frames: false,
		run_at: 'document_end',
		js: [
			'node_modules/es6lib/require.js',
			'node_modules/es6lib/namespace.js',
			'node_modules/es6lib/object.js',
			'node_modules/es6lib/functional.js',
			'node_modules/es6lib/concurrent.js',
			'node_modules/es6lib/dom.js',
			'node_modules/es6lib/network.js',
			'node_modules/es6lib/index.js',
			'node_modules/web-ext-utils/browser/index.js',
			'node_modules/web-ext-utils/options/index.js',
			'common/options.js',
			'content/index.js',
		],
	}, ];

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
			browser: [
				'index.js',
				'version.js',
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
