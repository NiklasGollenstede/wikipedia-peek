void define(`

*, *::before, *::after {
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
	min-width: 100vw;
}
#background { /* background with custom transparency */
	position: absolute;
	top: 0; bottom: 0;
	left: 0; right: 0;
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
	font-size: 40px; /* outer diameter */
	display: block; width: 1.2em; height: 1.2em; /* give the parent the proper size */
	margin: 0; padding: 0;
}
.loading .load-spinner::before, .load-spinner.loading::before {
	content: '';
	position: absolute;
	left: calc(50% - .5em);
	top: calc(50% - .5em);
	width: 1em; height: 1em;
	margin: 0; padding: 0;
	border-radius: 50%;
	box-sizing: border-box;
	border: .1em solid rgba(190, 190, 190, 0.8);
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
