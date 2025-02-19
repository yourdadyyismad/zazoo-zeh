const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const URL = 'https://sfmcompile.club/?redirect_to=random';
        const response = await axios.get(URL);

        console.log("Response Status:", response.status);

        if (response.status !== 200) {
            return res.status(response.status).json({ error: "Failed to fetch data" });
        }

        const $ = cheerio.load(response.data);
        let title = $('h1[itemprop="headline"]').text();
        let time = $('time[itemprop="datePublished"]').first().text().trim();
        let vid = $('video').first().attr('src')?.trim();

        if (!vid) {
            return res.status(404).json({ error: "Video source not found" });
        }

        res.json({
            creator: "DRACULA",
            status: response.status,
            title,
            released: time,
            video_link: vid
        });
    } catch (error) {
        console.error("Error fetching video:", error.message);
        res.status(500).json({ error: "Failed to fetch video details" });
    }
});

module.exports = router;