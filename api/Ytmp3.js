const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const ytdl = require('@vreden/youtube_scraper');
const { search } = require('yt-search');

const router = express.Router();

// Function to check file size
async function getFileSize(url) {
    try {
        const response = await axios.head(url); // Get headers
        const size = response.headers["content-length"];

        return size ? `${(size / (1024 * 1024)).toFixed(2)} MB` : "Unknown";
    } catch (error) {
        console.error("Error fetching MP3 file size:", error.message);
        return "Unknown";
    }
}

router.get("/", async (req, res) => {
    const userQuery = req.query.q;

    if (!userQuery) {
        return res.status(400).json({ error: "No query provided!" });
    }

    try {
        // Search YouTube
        const searchResults = await search(userQuery);
        if (!searchResults || !searchResults.videos.length) {
            return res.status(404).json({ error: "No results found." });
        }

        const video = searchResults.videos[0];
        const videoUrl = video.url;

        // Convert video to MP3
        const mp3Data = await ytdl.ytmp3(videoUrl);
        if (!mp3Data.status || !mp3Data.download || !mp3Data.download.url) {
            return res.status(500).json({ error: "MP3 conversion failed." });
        }

        // ✅ Check file size of the MP3 file
        const fileSize = await getFileSize(mp3Data.download.url);

        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            QUERY: userQuery,
            VIDEO_TITLE: video.title,
            VIDEO_URL: videoUrl,
            VIDEO_THUMBNAIL: video.thumbnail,
            DURATION: video.timestamp,
            MP3_URL: mp3Data.download.url,
            FILE_SIZE: fileSize // ✅ Now correctly checking the MP3 file size
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while processing the request." });
    }
});

module.exports = router;
