'use strict'; /* globals __dirname, process */ // license: MPL-2.0

const {
	concurrent: { spawn, promisify, },
	functional: { log, },
	fs: { FS, },
	process: { execute, },
} = require('es6lib');

spawn(function*() {

const { join, relative, resolve, dirname, } = require('path');

const [ _package, _manifest, ] = (yield Promise.all([ FS.readFile('package.json', 'utf8'), FS.readFile('manifest.json', 'utf8'), ])).map(JSON.parse);
[ 'title', 'version', 'author', ]
.forEach(key => {
	if (_manifest[key] && _package[key] !== _manifest[key]) { throw new Error('Key "'+ key +'" mismatch (package.json, manifest.json)'); }
});

const outputName = _package.title.toLowerCase().replace(/["\/\\|<>?*\x00-\x19 ]/g, '_') +'-'+ _package.version +'.xpi';

const include = {
	'.': [
		'background/',
		'common/',
		'content/',
		'ui/',
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
		'web-ext-utils': {
			'.': [ 'utils.js', ],
			chrome: [
				'index.js',
			],
			options: [
				'index.js',
				'editor.js',
				'editor-layout.css',
			],
		},
	},
};

const paths = [ ];
function addPaths(prefix, module) {
	if (Array.isArray(module)) { return paths.push(...module.map(file => join(prefix, file))); }
	Object.keys(module).forEach(key => addPaths(join(prefix, key), module[key]));
}

addPaths('.', include);

// const copy = promisify(require('fs-extra').copy);
// (yield paths.map(path => copy(path, join('tmp', path))));
// promisify(require('zip-dir'))('.', { saveTo: outputName, });

const files = { }, dirs = new Set;
(yield Promise.all(paths.map(path => (/(?:\\|\/)$/).test(path) ? FS.listDir(path).then(loadFiles) : loadFiles([ path, ]))));
function loadFiles(paths) {
	return Promise.all(paths.map(path => {
		path = relative(__dirname, path);
		let parent = path;
		while (
			(parent = dirname(parent)) && !dirs.has(parent)
		) { dirs.add(parent); }
		return FS.readFile(path).then(file => files[path] = file);
	}));
}
dirs.delete('.');


const zip = new (require('jszip'));

Array.from(dirs).sort().forEach(dir => zip.file(dir, null, { dir: true, }));
Object.keys(files).forEach(path => zip.file(path, files[path], { createFolders: false, }));

(yield FS.writeFile(outputName, (yield zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', }))));

})
.then(() => console.log('Build done'))
.catch(error => console.error('Error copying modules', error.stack || error) === process.exit(-1));
