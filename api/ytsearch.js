const express = require('express');
const yts = require('yt-search');

const router = express.Router();

router.get('/', async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: "No query provided!" });
    }

    try {
        const searchResults = await yts(query);
        const videos = searchResults.all.map(video => ({
            title: video.title,
            duration: video.timestamp,
            uploaded: video.ago,
            views: video.views,
            author: video?.author?.name || "Unknown",
            source: video.url
        }));

        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            QUERY: query,
            RESULTS: videos
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred while searching YouTube." });
    }
});

module.exports = router;
