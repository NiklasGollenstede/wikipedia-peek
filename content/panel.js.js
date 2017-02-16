/*eslint-disable strict*/ void define(() => port => { 'use strict'; // license: MPL-2.0

port.addHandlers({
	setStyle(style) {
		const element = document.querySelector('#content');
		const background = document.querySelector('#background').style;
		const content = element.style;
		content.color = style.color;
		content.fontFamily = style.fontFamily;
		content.fontSize = style.fontSize +'%';
		background.backgroundColor = style.backgroundColor;
		background.borderColor = style.color;
		background.opacity = (1 - style.transparency / 100);
		setSize();
	},
	loading() { // console.log('panel loading');
		document.querySelector('#content').innerHTML = '';
		document.body.classList.add('loading');
	},
	cancel() { // console.log('panel cancel');
		document.querySelector('#content').innerHTML = '';
		document.body.classList.remove('loading');
	},
	show(content, maxWidth) { // console.log('panel show', maxWidth);
		const element = document.querySelector('#content');
		element.style.maxWidth = maxWidth +'px';
		element.innerHTML = content;
		document.body.classList.remove('loading');
		setSize();
	},
	hide() { // console.log('panel hide');
		document.querySelector('#content').innerHTML = '';
		document.body.classList.remove('loading');
	},
});

function setSize() {
	const element = document.body;
	port.post('setSize', element.scrollWidth + 2, element.scrollHeight + 2);
}

window.port = port;

});
