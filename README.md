# youtube-crawler
Sorry about the sparse comments on this one.

The initial element of _channelArr_ is the starting point.  It gets all uploads from that channel.  It then crawls each channel in the original channel's playlists and subscriptions and repeats the process _crawlDepth_ times. 

The output is an array of Youtube video IDs in the file videos.txt.
