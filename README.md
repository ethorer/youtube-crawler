# youtube-crawler
This outputs a text file of YouTube video IDs.

The initial channel ID in _channelArr_ is the starting point.  It then crawls each channel in the original channel's playlists and subscriptions and repeats the process _crawlDepth_ times.  Each channel is checked against a list of already-crawled channels so none are crawled twice.  It then gets all the uploads from the collected channels.

Run with Node: <code>node app.js</code>

The dependencies are in the package.json file.  Install using <code>npm install</code>

<p>
A few notes:  Be careful with high values of crawlDepth.  A value of 3 can result in well over 100,000 videos, depending on which channel you start with.
Also, if you stop the program, the list of crawled channels will not be saved, so you may end up with duplicate videos if you run it again.
</p>

<h3>Getting your own API key</h3><p>
This uses the YouTube API which has a daily quota on the number of API calls.  You may want to use your own API key (variable "key" near top of app.js).
To do so is free.  
<ol>
<li>Use a Google account to sign into Google Developers Console (https://console.developers.google.com/)</li>
<li>On the left-hand menu select "Library"</li>
<li>Search for "youtube" and select the YouTube Data API v3</li>
<li>Enable it and then select "credentials" on the left-hand menu</li>
<li>On the new screen select "create credentials" and create an API key.</li>
<li>Replace the variable "key" in app.js with your key.</li>
</ol>
</p>

