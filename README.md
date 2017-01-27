<b>Shows previews of linked articles on Wikipedia pages.</b>

When you hover a link to another article on Wikipedia or tap on it, a small pop-up will show you the title section of that article.

Features: <ul>
	<li>Full touch support</li>
	<li>4 themes (Wikipedia, white, black, grey/blue)</li>
	<li>Customizable font-size and transparency</li>
	<li>Works in <a href="https://chrome.google.com/webstore/detail/planddpadjimakmjdpnolpjjphhooiej">Chrome</a>, <a href="https://addons.mozilla.org/firefox/addon/wikipedia-peek/">Firefox</a>, <a href="https://addons.opera.com/extensions/details/wikipedia-peek/">Opera</a> and <a href="https://addons.mozilla.org/android/addon/wikipedia-peek/">Firefox for Android</a></li>
</ul>

This add-ons code is available on <a href="https://github.com/NiklasGollenstede/wikipedia-peek">GitHub</a>. If you have any problems, please report them <a href="https://github.com/NiklasGollenstede/wikipedia-peek/issues">here</a>

The add-on itself does not collect any data. Note however, that the article previews are queried form Wikipedia in a separate query each time you hover over a link long enough.

# How to Build

  - `git clone https://github.com/NiklasGollenstede/wikipedia-peek && cd wikipedia-peek`
  - `npm install`
  - `npm start`<br>
    and temporary load from the `./build/` directory, use the `.zip` file therein<br>
    or `npm start -- {run:1}` to debug in a new Firefox instance.
