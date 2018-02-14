/*eslint-disable strict*/ void define(() => port => { 'use strict'; /* global window, document, */ // license: MPL-2.0

const style = document.head.appendChild(document.createElement('style'));

port.addHandlers({
	setStyle(css) {
		style.textContent = css;
		return size();
	},
	setState(state, arg) {
		[ 'hidden', 'loading', 'failed', 'showing', ].forEach(state => document.body.classList.remove(state));
		document.body.classList.add(state);
		switch (state) {
			case 'showing': {
				const { content, maxWidth, } = arg;
				const scripts = [ ], element = document.querySelector('#content');
				element.style.maxWidth = maxWidth +'px';
				element.innerHTML = content.replace(/<script>([^]*?)<\/script>/g, (_, script) => (scripts.push(script), ''));
				document.body.classList.remove('loading');
				document.body.classList.remove('failed');
				scripts.forEach(eval);
			} break;
			case 'hidden': {
				document.querySelector('#content').innerHTML = '';
			} break;
			case 'failed': {
				document.querySelector('#fail-cross').style.visibility = arg ? 'visible' : 'hidden';
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
	return { width: size.width, scrollWidth: element.scrollWidth, height: size.height, scrollHeight: element.scrollHeight, };
}

window.resize = () => port.post('setSize', size());

});
