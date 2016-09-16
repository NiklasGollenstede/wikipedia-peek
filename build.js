'use strict'; /* globals __dirname, process */ // license: MPL-2.0

const {
	concurrent: { spawn, promisify, },
	functional: { log, },
	fs: { FS, },
	process: { execute, },
} = require('es6lib');

spawn(function*() {

const { join, relative, resolve, dirname, basename, } = require('path');

const [ _package, _manifest, ] = (yield Promise.all([ FS.readFile('package.json', 'utf8'), FS.readFile('manifest.json', 'utf8'), ])).map(JSON.parse);
[ 'title', 'version', 'author', ]
.forEach(key => {
	if (_manifest[key] && _package[key] !== _manifest[key]) { throw new Error('Key "'+ key +'" mismatch (package.json, manifest.json)'); }
});

const outputName = _package.title.toLowerCase().replace(/["\/\\|<>?*\x00-\x19 ]/g, '_') +'-'+ _package.version;

const include = {
	'.': [
		'background/',
		'common/',
		'content/',
		'ui/',
		'update/',
		'icon.png',
		'LICENSE',
		'manifest.json',
		'package.json',
		'README.md',
	],
	node_modules: {
		es6lib: [
			'require.js',
			'namespace.js',
			'object.js',
			'functional.js',
			'concurrent.js',
			'dom.js',
			'network.js',
			'index.js',
		],
		'web-ext-utils': [
			'utils.js',
			'chrome/',
			'options/',
			'update/',
		],
	},
};

const outputJson = promisify(require('fs-extra').outputJson);
for (let component of (yield FS.readdir(resolve(__dirname, `update`)))) {
	const names = (yield FS.readdir(resolve(__dirname, `update/${ component }`)))
	.filter(_=>_ !== 'versions.json')
	.map(path => basename(path).slice(0, -3));
	(yield outputJson(resolve(__dirname, `update/${ component }/versions.json`), names));
}

const paths = [ ];
(function addPaths(prefix, module) {
	if (Array.isArray(module)) { return paths.push(...module.map(file => join(prefix, file))); }
	Object.keys(module).forEach(key => addPaths(join(prefix, key), module[key]));
})('.', include);

const copy = promisify(require('fs-extra').copy);
const remove = promisify(require('fs-extra').remove);
(yield Promise.all(paths.map(path => copy(path, join('build', path)).catch(error => console.error('Skipping missing file/folder "'+ path +'"')))));


(yield promisify(require('zip-dir'))('./build', { filter: path => !(/\.(?:zip|xpi)$/).test(path), saveTo: `./build/${ outputName }.zip`, }));


})
.then(() => console.log('Build done'))
.catch(error => console.error('Error during build:', error.stack || error) === process.exit(-1));
