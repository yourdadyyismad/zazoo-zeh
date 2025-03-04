const express = require('express');
const wiki = require('wikipedia');

const router = express.Router();

router.get('/', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "No query provided!" });

    try {
        // Fetch the Wikipedia summary
        const page = await wiki.summary(query);
        const creator = "DRACULA"

        res.json({
            CREATOR: creator,
            STATUS: 200,
            QUERY: query,
            TITLE: page.title,
            SUMMARY: page.extract,
            URL: page.content_urls.desktop.page,
            THUMBNAIL: page.thumbnail ? page.thumbnail.source : null
        });

    } catch (error) {
        res.status(500).json({ error: "Failed to fetch Wikipedia summary." });
    }
});

module.exports = router;
