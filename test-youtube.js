const YOUTUBE_API_KEY = "AIzaSyCPBvIRhLXGByRcLpu_lnne7ZCbCYsKkzk";
fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=test&relevanceLanguage=tr&key=${YOUTUBE_API_KEY}`)
.then(res => res.json())
.then(console.log);
