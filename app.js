const http = require('http');
const {google} = require('googleapis');
const fs = require('fs');
const search = require('./fstest');

var key = "AIzaSyDzAfM206gA6isu0o77N1XkZUhe5uYC3Mk";

const youtube = google.youtube('v3');

var channelArr = [];

var channelFile = [];

var channelsCrawled = fs.readFileSync("channelsCrawled.txt", "utf-8").split(",");
fs.openSync("videos.txt");

channelArr = ['UCf89gJ9hk4E4gskQWYImr8A'];

var crawlIter = 0;
var crawlDepth = 3;
var uploadIter = 0;
var a = 0;

console.log(channelFile); 

crawlChannels(crawlIter, crawlDepth);

function crawlChannels(crawlIter, crawlDepth) {

    if (crawlDepth > 0 && crawlIter === a){
        crawlDepth--;
        a = channelArr.length;
    }

    if (crawlDepth > 0 && crawlIter < channelArr.length)
        getChannelSubscriptions(channelArr[crawlIter], null, []); // gets all connected channels
    else if (uploadIter < channelArr.length) 
        getChannelUploadsNew(channelArr[uploadIter++]);
    else{
        fs.writeFile("channelsCrawled.txt", channelsCrawled.toString(), () => console.log('channels saved'))
    }

}

function getChannelSubscriptions(channel, pageToken, resultArr) {

    youtube.subscriptions.list({
        part: 'snippet',
        channelId: channel,
        key: key,
        maxResults: 50,
        pageToken: pageToken
    }).then((res) => putChannelSubscriptionsInArray(channel, res, resultArr))
    .catch((err) => {
            console.log('error getting subscriptions for channel ' + channel);
            getChannelPlaylistChannels(channel, null, []);
    });

}

async function putChannelSubscriptionsInArray(channel, res, resultArr) {

    const arr = res.data.items
    
    for (var i = 0; i < arr.length; i++)
        resultArr.push(arr[i].snippet.resourceId.channelId);

    if ('nextPageToken' in res.data)
        getChannelSubscriptions(channel, res.data.nextPageToken, resultArr);
    else{
         for (var i = 0; i < resultArr.length; i++) {
            if ((search.binarySearch(resultArr[i], channelArr) > -1)
                 || (search.binarySearch(resultArr[i], channelFile) > -1)){
                    console.log('found');
                    continue;
                }
            else{
                //search.insert(resultArr[i], channelArr);
                channelArr.push(resultArr[i]);
                search.insert(resultArr[i], channelFile);
            }
        }

        getChannelPlaylistChannels(channel, null, []);
    }

}

function getChannelPlaylistChannels(channel, pageToken, resultArr) {

     youtube.playlists.list({
        part: 'snippet',
        key: key,
        channelId: channel,
        maxResults: 50,
        pageToken: pageToken
     }).then((res) => putPlaylistsInArray(channel, res, resultArr))
     .catch((err) => {
        console.log('getChannelPlaylistChannels ' + err);
        crawlChannels(++crawlIter, crawlDepth);
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
        getChannelPlaylistChannels(channel, res.data.nextPageToken, resultArr);
    else
        getChannelsFromPlaylists(channel, resultArr, 0);
    
}

function getChannelsFromPlaylists(channel, resultArr, i) { // resultArr contains playlists

    // console.log(i);
    // console.log(resultArr);
    // console.log(resultArr[i]);
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

function getChannelsFromVideos(channel, resultArr, data, j, i) {

    debugger;
    if (data.data.items[j]){

    var id = data.data.items[j].snippet.resourceId.videoId;
       // console.log('passed ID');

    youtube.videos.list({
        part: 'snippet',
        key: key,
        id: id
    }).then((res) => {
        //console.log('array length ' + resultArr.length + ' i = ' + i);

        if (res.data.items[0]) {

            var videoChannel = res.data.items[0].snippet.channelId;

            if (videoChannel === channel && i < resultArr.length - 1)
                getChannelsFromPlaylists(channel, resultArr, i + 1); // to avoid playlists creators make of their own uploads
            else if (search.binarySearch(channelFile, videoChannel) > -1){
                if (j < (data.data.items).length - 1)
                    getChannelsFromVideos(channel, resultArr, data, j + 1, i);
                else if (i < resultArr.length - 1)
                    getChannelsFromPlaylists(channel, resultArr, i + 1);
                else
                    crawlChannels(++crawlIter, crawlDepth);
            }
            else if (j < (data.data.items).length - 1){
                if (videoChannel){
                    channelArr.push(videoChannel);
                    search.insert(videoChannel, channelFile);
                    console.log('collecting channel ' + videoChannel);
                }
                getChannelsFromVideos(channel, resultArr, data, j + 1, i);
            }            
            else if (i < resultArr.length - 1){
                if (videoChannel){
                    channelArr.push(videoChannel);
                    search.insert(videoChannel, channelFile);
                    console.log('collecting channel ' + videoChannel);
                }
                getChannelsFromPlaylists(channel, resultArr, i + 1);
            }
            else
                crawlChannels(++crawlIter, crawlDepth);
        }
        else if (j < (data.data.items).length - 1)
            getChannelsFromVideos(channel, resultArr, data, j + 1, i);
        else if (i < resultArr.length - 1)
            getChannelsFromPlaylists(channel, resultArr, i + 1);
        else
            crawlChannels(++crawlIter, crawlDepth);

    }).catch((err) => console.log('getChannelsFromVideos ' + err));
    }
    else if (i < resultArr.length - 1)
        getChannelsFromPlaylists(channel, resultArr, i + 1);
    else
        crawlChannels(++crawlIter, crawlDepth);

}

function getChannelUploadsNew(channel) { 
    
    if (search.binarySearch(channelsCrawled, channel) > -1){
        console.log('already got uploads for ' + channel);
        crawlChannels(crawlIter, crawlDepth);
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
        }).catch((err) => console.log('getChannelUploadsNew ' + err));
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
     .catch((err) => console.log('getVideosFromPlaylist ' + err));

}

function putVideosInArray(playlistId, data) {

    const arr = data.data.items;

    for (var i = 0; i < arr.length; i++)
        //videoArr.unshift(arr[i].contentDetails.videoId);
        fs.appendFileSync("videos.txt", arr[i].contentDetails.videoId + ",");

    if ('nextPageToken' in data.data){
        getVideosFromPlaylist(data.data.nextPageToken, playlistId);
    }
    else{
        //console.log(videoArr);
        crawlChannels(crawlIter, crawlDepth);
    }

}