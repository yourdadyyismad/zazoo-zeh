const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const yts = require('yt-search');
const ytdl = require('@vreden/youtube_scraper');

const router = express.Router();

router.get('/', async (req, res) => {
    const userQuery = req.query.q;

    if (!userQuery) {
        return res.status(400).json({ error: "No query provided!" });
    }

    try {
        // Search YouTube
        const searchResults = await yts(userQuery);
        const firstVideo = searchResults.videos[0];

        if (!firstVideo) {
            return res.status(404).json({ error: "No video found!" });
        }

        // Extract video details
        const videoUrl = firstVideo.url;
        const videoTitle = firstVideo.title;
        const videoThumbnail = firstVideo.thumbnail;
        const duration = firstVideo.timestamp;

        // Fetch MP4 download link
        const videoData = await ytdl.ytmp4(videoUrl);
        if (!videoData.status) {
            return res.status(500).json({ error: "Failed to fetch MP4 link" });
        }

        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            QUERY: userQuery,
            VIDEO_TITLE: videoTitle,
            VIDEO_URL: videoUrl,
            VIDEO_THUMBNAIL: videoThumbnail,
            DURATION: duration,
            MP4_URL: videoData.download.url,
            QUALITY: "720p" // Adjust if needed
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
