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

	manifestJson.description = 'Shows previews of links to Wikipedia, Wikia, IMDB and more';

	manifestJson.browser_action = {
		default_icon: manifestJson.icons,
		default_title: `Toggle ${manifestJson.name}`,
	};

	!options.viewRoot && (options.viewRoot = options.chrome ? 'WikiPeek.html' : 'WikiPeek');

	// TODO: this may contain unnecessary entries:
	files.node_modules = [
		'es6lib/network.js',
		'es6lib/string.js',
		'multiport/index.js',
		'pbq/require.js',
		'readability/Readability.js',
		'regexpx/index.js',
		'web-ext-utils/browser/index.js',
		'web-ext-utils/browser/messages.js',
		'web-ext-utils/browser/storage.js',
		'web-ext-utils/browser/version.js',
		'web-ext-utils/loader/_background.html',
		'web-ext-utils/loader/_background.js',
		'web-ext-utils/loader/_view.html',
		'web-ext-utils/loader/_view.js',
		'web-ext-utils/loader/content.js',
		'web-ext-utils/loader/index.js',
		'web-ext-utils/loader/views.js',
		'web-ext-utils/options/editor/about.js',
		'web-ext-utils/options/editor/about.css',
		'web-ext-utils/options/editor/index.js',
		'web-ext-utils/options/editor/index.css',
		'web-ext-utils/options/editor/inline.css',
		'web-ext-utils/options/editor/inline.js',
		'web-ext-utils/options/index.js',
		'web-ext-utils/update/index.js',
		'web-ext-utils/utils/icons/',
		'web-ext-utils/utils/event.js',
		'web-ext-utils/utils/files.js',
		'web-ext-utils/utils/index.js',
		'web-ext-utils/utils/notify.js',
		'web-ext-utils/utils/semver.js',
	];

};
