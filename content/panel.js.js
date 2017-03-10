/*eslint-disable strict*/ void define(() => port => { 'use strict'; // license: MPL-2.0

port.addHandlers({
	setStyle(style, popup) {
		const element = document.querySelector('#content');
		const background = document.querySelector('#background').style;
		const content = element.style;
		content.color = style.color;
		content.fontFamily = style.fontFamily;
		content.fontSize = style.fontSize +'%';
		popup && (document.body.maxHeight = '100vh');
		popup && (document.body.overflowY = 'auto');
		background.backgroundColor = style.backgroundColor;
		background.borderColor = popup ? 'transparent' : style.color;
		background.opacity = (1 - style.transparency / 100);
		return size();
	},
	loading() { // console.log('panel loading');
		document.querySelector('#content').innerHTML = '';
		document.body.classList.add('loading');
		return size();
	},
	show(content, maxWidth) { // console.log('panel show', maxWidth);
		const scripts = [ ], element = document.querySelector('#content');
		element.style.maxWidth = Math.min(maxWidth, screen.width) +'px';
		element.innerHTML = content.replace(/<script>([^]*?)<\/script>/g, (_, script) => (scripts.push(script), ''));
		document.body.classList.remove('loading');
		scripts.forEach(eval);
		return size();
	},
	hide() { // console.log('panel hide');
		document.querySelector('#content').innerHTML = '';
		document.body.classList.remove('loading');
	},
	await(type) {
		return new Promise(onclick => document.addEventListener(type, () => onclick(), { once: true, }));
	},
	isHovered() { return document.body.matches(':hover'); },
});

function size() {
	const element = document.body, size = document.body.getBoundingClientRect();
	return { width: size.width, scrollWidth: element.scrollWidth, height: size.height, scrollHeight: element.scrollHeight, dpr: devicePixelRatio, };
}

window.resize = () => port.post('setSize', size());

});
