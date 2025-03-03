const express = require('express');
const axios = require('axios');
const yts = require('yt-search');
const ytdl = require('@vreden/youtube_scraper');

const router = express.Router();

// Function to get file size from URL
async function getFileSize(url) {
    try {
        const response = await axios.head(url);
        const size = response.headers['content-length'];
        return size ? `${(size / (1024 * 1024)).toFixed(2)} MB` : "Unknown";
    } catch (error) {
        return "Unknown";
    }
}

router.get('/', async (req, res) => {
    const userQuery = req.query.q;
    if (!userQuery) return res.status(400).json({ error: "No query provided!" });

    try {
        // Search YouTube
        const searchResults = await yts(userQuery);
        const firstVideo = searchResults.videos[0];

        if (!firstVideo) return res.status(404).json({ error: "No video found!" });

        const videoUrl = firstVideo.url;
        const videoTitle = firstVideo.title;
        const videoThumbnail = firstVideo.thumbnail;
        const duration = firstVideo.timestamp;

        // Fetch MP4 download link
        const videoData = await ytdl.ytmp4(videoUrl);
        if (!videoData.status) return res.status(500).json({ error: "Failed to fetch MP4 link" });

        const mp4Url = videoData.download.url;
        const fileSize = await getFileSize(mp4Url);

        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            QUERY: userQuery,
            VIDEO_TITLE: videoTitle,
            VIDEO_URL: videoUrl,
            VIDEO_THUMBNAIL: videoThumbnail,
            DURATION: duration,
            MP4_URL: mp4Url,
            FILE_SIZE: fileSize,
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
