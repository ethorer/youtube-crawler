const {google} = require('googleapis');
const youtube = google.youtube('v3');
const fs = require('fs');
const search = require('./search');

var key = 'AIzaSyDzAfM206gA6isu0o77N1XkZUhe5uYC3Mk';

if (!(fs.existsSync('./channelsCrawled.txt'))) {
    fs.closeSync(fs.openSync('./channelsCrawled.txt', 'w'));
}

var videosFile = fs.openSync('./videos.txt', 'w');
    
var channelsCrawled = fs.readFileSync('channelsCrawled.txt', 'utf-8').split(',');

var channelArr = ['UCZh_VAOV5N4r31JEVz7A7iQ'];
var channelSorted = []; // sorted channel array to check for duplicates

var crawlIter = 0;
var crawlDepth = 3;
var uploadIter = 0;
var mark = 0; 

crawlChannels(crawlIter);

function crawlChannels(crawlIter) {

    console.log(crawlDepth);

    // 'mark' is for checking if we are done with the current batch of channels;
    // 'crawlIter' is the index of the channelArr array
    if (crawlDepth > 0 && crawlIter >= mark){
         crawlDepth--;
         mark = channelArr.length;
     }

    if (crawlDepth > 0 && crawlIter < channelArr.length)
        getChannelSubscriptions(channelArr[crawlIter], null, []); // starts channel collection
    else if (uploadIter < channelArr.length) 
        getChannelUploads(channelArr[uploadIter++]); // gets uploads of all collected channels
    else{
        fs.closeSync(videosFile);
        fs.writeFile('channelsCrawled.txt', channelsCrawled.toString(), () => console.log('channels saved'))
    }

}

// next two functions: get the channel's subscriptions and put them in an array

function getChannelSubscriptions(channel, pageToken, resultArr) {

    youtube.subscriptions.list({
        part: 'snippet',
        channelId: channel,
        key: key,
        maxResults: 50,
        pageToken: pageToken
    }).then((res) => putChannelSubscriptionsInArray(channel, res, resultArr))
    .catch((err) => {
            console.log('unable to get subscriptions for channel ' + channel);
            getChannelPlaylists(channel, null, []);
    });

}

function putChannelSubscriptionsInArray(channel, res, resultArr) {

    const arr = res.data.items
    
    for (var i = 0; i < arr.length; i++)
        resultArr.push(arr[i].snippet.resourceId.channelId);

    // Gets the next pages of subscriptions if there are any.  When done,
    // check for duplicates, then iterate through the list of channels we just made to
    // crawl their playlists
    if ('nextPageToken' in res.data)
        getChannelSubscriptions(channel, res.data.nextPageToken, resultArr);
    else{
         for (var i = 0; i < resultArr.length; i++) {
            if //((search.binarySearch(resultArr[i], channelArr) > -1)
                  ((search.binarySearch(channelSorted, resultArr[i]) > -1)){
                    console.log('duplicate channel (subscription) ' + resultArr[i] + ' from ' + channel);
                    continue;
                }
            else{
                channelArr.push(resultArr[i]); 
                search.insert(resultArr[i], channelSorted);
            }
        }

        getChannelPlaylists(channel, null, []);
    }

}

// next four functions: crawl the channel's playlists to get more channels,

function getChannelPlaylists(channel, pageToken, resultArr) {

     youtube.playlists.list({
        part: 'snippet',
        key: key,
        channelId: channel,
        maxResults: 50,
        pageToken: pageToken
     }).then((res) => putPlaylistsInArray(channel, res, resultArr))
     .catch((err) => {
        console.log('getChannelPlaylists ' + err);
        crawlChannels(++crawlIter);
        }
        );

}

function putPlaylistsInArray(channel, res, resultArr) {

    const items = res.data.items;

    for (var i = 0; i < items.length; i++){
        if (items[i].id)
            resultArr.push(items[i].id);
        console.log('collecting playlist ' + items[i].id);
    }

    if ('nextPageToken' in res.data)
        getChannelPlaylists(channel, res.data.nextPageToken, resultArr);
    else
        getChannelsFromPlaylists(channel, resultArr, 0);
    
}

 // resultArr contains the playlists, i is its index
function getChannelsFromPlaylists(channel, resultArr, i) {

    if (resultArr.length > 0 && (search.binarySearch(channelSorted, channel) == -1)) {
        youtube.playlistItems.list({
            part: 'snippet',
            key: key,
            playlistId: resultArr[i],
            maxResults: 50
        }).then((res) => {
            getChannelsFromVideos(channel, resultArr, res, 0, i);
        })
        .catch((err) => console.log(err));
    }
    else {
        crawlChannels(++crawlIter);
    }

}

// j is the index of the item in the playlist, i is the index of 
//the playlist (passed from last function)
function getChannelsFromVideos(channel, resultArr, data, j, i) {  

    if (data.data.items[j]){

    var id = data.data.items[j].snippet.resourceId.videoId;

    // this API call gets the snippet from a video -- we will be 
    // working with the channelId of the video, named videoChannel below
    youtube.videos.list({
        part: 'snippet',
        key: key,
        id: id
    }).then((res) => {

        // res.data.items[0] is the part of the response containing the snippet
        if (res.data.items[0]) {

            var videoChannel = res.data.items[0].snippet.channelId;

            // to avoid playlists of the channel's own uploads
            if (videoChannel === channel && i < resultArr.length - 1) 
                getChannelsFromPlaylists(channel, resultArr, i + 1); 
            // to avoid duplicates
            else if (search.binarySearch(channelSorted, videoChannel) > -1){ 
                console.log('duplicate channel (playlist) ' + videoChannel + ' from ' + channel)
                if (j < (data.data.items).length - 1)
                    getChannelsFromVideos(channel, resultArr, data, j + 1, i);
                else if (i < resultArr.length - 1)
                    getChannelsFromPlaylists(channel, resultArr, i + 1);
                else
                    crawlChannels(++crawlIter);
            }
            // the rest of the conditions are checking for whether we are
            // at the end of the list of videos / playlists or not
            else if (j < (data.data.items).length - 1){
                if (videoChannel){
                    channelArr.push(videoChannel);
                    search.insert(videoChannel, channelSorted);
                    console.log('collecting channel ' + videoChannel);
                }
                getChannelsFromVideos(channel, resultArr, data, j + 1, i);
            }            
            else if (i < resultArr.length - 1){
                if (videoChannel){
                    channelArr.push(videoChannel);
                    search.insert(videoChannel, channelSorted);
                    console.log('collecting channel ' + videoChannel);
                }
                getChannelsFromPlaylists(channel, resultArr, i + 1);
            }
            else
                crawlChannels(++crawlIter);
        }
        else if (j < (data.data.items).length - 1)
            getChannelsFromVideos(channel, resultArr, data, j + 1, i);
        else if (i < resultArr.length - 1)
            getChannelsFromPlaylists(channel, resultArr, i + 1);
        else
            crawlChannels(++crawlIter);

    }).catch((err) => console.log('getChannelsFromVideos ' + err));
    }
    else if (i < resultArr.length - 1)
        getChannelsFromPlaylists(channel, resultArr, i + 1);
    else
        crawlChannels(++crawlIter);

}

// next three functions: get the channel's uploads and put them in the list of videos 

function getChannelUploads(channel) { 
    
    if (search.binarySearch(channelsCrawled, channel) > -1){
        console.log('already got uploads for ' + channel);
        crawlChannels(crawlIter);
    }
    else {
        console.log('getting uploads for ' + channel);
        search.insert(channel, channelsCrawled);

        youtube.channels.list({
            part: 'contentDetails',
            key: key,
            id: channel
        }).then((res) => {
            getVideosFromPlaylist(null, res.data.items[0].contentDetails
                .relatedPlaylists.uploads);
        }).catch((err) => console.log('getChannelUploads ' + err));
}

}

function getVideosFromPlaylist(pageToken, playlistId) {

    youtube.playlistItems.list({
        part: 'contentDetails',
        playlistId: playlistId,
        key: key,
        maxResults: 50,
        pageToken: pageToken
    }).then((data) => putVideosInArray(playlistId, data))
     .catch((err) => {
        console.log('getVideosFromPlaylist ' + err);
        crawlChannels(++crawlIter);
    })

}

function putVideosInArray(playlistId, data) {

    const arr = data.data.items;

    for (var i = 0; i < arr.length; i++)
        fs.appendFileSync("videos.txt", arr[i].contentDetails.videoId + ",");

    if ('nextPageToken' in data.data){
        getVideosFromPlaylist(data.data.nextPageToken, playlistId);
    }
    else{
        crawlChannels(crawlIter);
    }

}