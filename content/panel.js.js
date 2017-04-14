/*eslint-disable strict*/ void define(() => port => { 'use strict'; /* global window, document, */ // license: MPL-2.0

port.addHandlers({
	setStyle(style) {
		const content = document.querySelector('#content').style;
		const background = document.querySelector('#background').style;
		const border = document.querySelector('#border').style;
		content.color = style.color;
		content.fontFamily = style.fontFamily;
		content.fontSize = style.fontSize +'%';
		background.backgroundColor = style.backgroundColor;
		border.borderColor = style.color;
		background.opacity = border.opacity = (1 - style.transparency / 100);
		return size();
	},
	setState(state, arg) {
		[ 'hidden', 'loading', 'failed', 'showing', ].forEach(state => document.body.classList.remove(state));
		document.body.classList.add(state);
		switch (state) {
			case 'showing': {
				const { content, maxWidth, } = arg;
				const scripts = [ ], element = document.querySelector('#content');
				element.style.maxWidth = Math.min(maxWidth, window.screen.width) +'px';
				element.innerHTML = content.replace(/<script>([^]*?)<\/script>/g, (_, script) => (scripts.push(script), ''));
				document.body.classList.remove('loading');
				document.body.classList.remove('failed');
				scripts.forEach(eval);
			} break;
			case 'hidden': {
				document.querySelector('#content').innerHTML = '';
			} break;
		}
		return size();
	},
	await(type) {
		return new Promise(occurred => document.addEventListener(type, () => occurred(), { once: true, }));
	},
	isHovered() { return document.body.matches(':hover'); },
});

function size() {
	const element = document.body, size = document.body.getBoundingClientRect();
	return { width: size.width, scrollWidth: element.scrollWidth, height: size.height, scrollHeight: element.scrollHeight, dpr: window.devicePixelRatio, };
}

window.resize = () => port.post('setSize', size());

});
