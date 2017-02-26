/*eslint-disable strict*/ void define([ 'require', './panel.js', './panel.css', 'node_modules/es6lib/port', ], (require, js, css) => (`<!DOCTYPE html>
<html>
	<head>
		<meta http-equiv="Content-Type" content="text/html; charset=utf-8">
		<style type="text/css">${ css }</style>
	</head>
	<body>
		<div id="spinner" class="load-spinner"></div>
		<div id="content"></div>
		<div id="background"></div>
	</body>
`)); // omit </html>
