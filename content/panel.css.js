void define(`

* {
	box-sizing: border-box;
}

body {
	margin: 0;
	padding: 0;
	border: none;
	overflow: hidden;
	font-family: arial,sans-serif;
}

#content {
	position: relative;
	z-index: 1;
	background-color: transparent;
	padding: 5px 10px;
	border: 1px solid;
	border-color: transparent; /* see through to #background */
	color: black;
	hyphens: auto;
	-ms-hyphens: auto;
	-webkit-hyphens: auto;
}
#background { /* background with custom transparency */
	position: absolute;
	top: 0;
	left: 0;
	width: calc(100% - 2px);
	height: calc(100% - 2px);
	z-index: -1;
	background-color: white;
	border: 1px solid;
	border-color: black;
	opacity: 1; /* overwritten by js */
}
.loading #content, .loading #background {
	display: none;
}

/* load spinners */
.load-spinner {
	display: none;
}
.loading .load-spinner, .load-spinner.loading {
	display: block;
	position: absolute;
	font-size: /* SPINNER_SIZE */ 40px; /* that comment must stay there */
	left: calc(50% - .5em);
	top: calc(50% - .5em);
	width: 1em; height: 1em;
	margin: 0; padding: 0;
	border-radius: 50%;
	border: 4px solid rgba(190, 190, 190, 0.8);
	border-left-color: rgba(100, 100, 100, 0.8);
	animation: spin .8s infinite cubic-bezier(.3,.6,.8,.5);
}
@keyframes spin {
	0% { transform: rotate(0deg); }
	100% { transform: rotate(360deg); }
}

/* lists */
#content ul {
	list-style: none;
	margin-left: 0;
}
#content ul>li {
	padding-left: 1em;
}
#content ul>li::before {
	content: "•";
	position: absolute;
	left: 0.7em;
}
#content ol {
	margin-left: 1.2em;
}


/* fix missing mathML in webkit browsers */
@media screen and (-webkit-min-device-pixel-ratio:0)
{
	math *
	{ display: inline !important; }
	math annotation
	{ display: none !important; }
}

`);
