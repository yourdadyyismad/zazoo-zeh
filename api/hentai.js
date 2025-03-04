const express = require('express');
const puppeteer = require('puppeteer-core');

const router = express.Router();
const BASE_URL = 'https://gogoanime3.net';

async function getEpisodes(animeId) {
    const browser = await puppeteer.launch({
        executablePath: '/usr/bin/chromium',  // ✅ Set the custom Chromium path
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/category/${animeId}`, { waitUntil: 'load' });

    const episodes = await page.evaluate(() => {
        const episodeList = [];
        document.querySelectorAll('.episode_related ul li a').forEach(el => {
            episodeList.push({
                epNum: el.innerText.trim(),
                epId: el.getAttribute('href').split('/')[1]
            });
        });
        return episodeList.reverse();
    });

    await browser.close();
    return episodes;
}

// Route: Get Episodes of an Anime
router.get('/', async (req, res) => {
    const animeId = req.query.id;
    if (!animeId) return res.status(400).json({ error: "No anime ID provided!" });

    try {
        const episodes = await getEpisodes(animeId);
        if (episodes.length === 0) return res.status(404).json({ error: "No episodes found!" });

        res.json(episodes);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch episodes", details: error.message });
    }
});

module.exports = router;
