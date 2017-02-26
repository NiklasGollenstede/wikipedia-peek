/*eslint-disable strict*/ void define(() => port => { 'use strict'; // license: MPL-2.0

port.addHandlers({
	setStyle(style, popup) {
		const element = document.querySelector('#content');
		const background = document.querySelector('#background').style;
		const content = element.style;
		content.color = style.color;
		content.fontFamily = style.fontFamily;
		content.fontSize = style.fontSize +'%';
		popup && (content.maxHeight = '100vh');
		popup && (content.overflowY = 'auto');
		background.backgroundColor = style.backgroundColor;
		background.borderColor = popup ? 'transparent' : style.color;
		background.opacity = (1 - style.transparency / 100);
		return { width: element.scrollWidth, height: element.scrollHeight, };
	},
	loading() { // console.log('panel loading');
		document.querySelector('#content').innerHTML = '';
		document.body.classList.add('loading');
		const spinner = document.querySelector('#spinner');
		return { width: spinner.clientWidth, height: spinner.clientHeight, };
	},
	show(content, maxWidth) { // console.log('panel show', maxWidth);
		const element = document.querySelector('#content');
		element.style.maxWidth = maxWidth +'px';
		element.innerHTML = content;
		document.body.classList.remove('loading');
		return { width: element.scrollWidth, height: element.scrollHeight, };
	},
	hide() { // console.log('panel hide');
		document.querySelector('#content').innerHTML = '';
		document.body.classList.remove('loading');
	},
});

window.port = port;

});
