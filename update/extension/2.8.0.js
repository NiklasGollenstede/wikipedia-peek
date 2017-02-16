(function(global) { 'use strict'; define(async ({ // This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0. If a copy of the MPL was not distributed with this file, You can obtain one at http://mozilla.org/MPL/2.0/.
	'node_modules/web-ext-utils/browser/': { Storage, },
	'common/options': { children: options, },
}) => {

const style = options.style.children;
const oldKeys = [ 'options.theme', 'options.fontSize', 'options.relativeWidth', 'options.transparency', ];
const data = (await Storage.get(oldKeys));

switch (data['options.theme']) {
	case 'color: inherit; background-color: inherit; border: 1px solid; border-color: inherit;': break;
	case 'color: black;   background-color: white;   border: 1px solid black;': style.color.value = '#000000'; style.backgroundColor.value = '#ffffff'; break;
	case 'color: white;   background-color: #343C45; border: 1px solid white;': style.color.value = '#ffffff'; style.backgroundColor.value = '#343C45'; break;
	case 'color: white;   background-color: black;   border: 1px solid white;': style.color.value = '#ffffff'; style.backgroundColor.value = '#000000'; break;
}
style.fontSize.value = oldKeys['options.fontSize'];
style.width.value = oldKeys['options.relativeWidth'];
style.transparency.value = oldKeys['options.transparency'];

(await Storage.remove(oldKeys));

}); })(this);
