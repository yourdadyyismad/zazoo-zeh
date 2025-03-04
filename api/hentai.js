const express = require('express');
const puppeteer = require('puppeteer-core');

const router = express.Router();
const BASE_URL = 'https://gogoanimehd.io';

// Function to get episodes with Puppeteer
async function getEpisodes(animeId) {
    const browser = await puppeteer.launch({ headless: true });
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
router.get('/episodes', async (req, res) => {
    const animeId = req.query.id;
    if (!animeId) return res.status(400).json({ error: "No anime ID provided!" });

    const episodes = await getEpisodes(animeId);
    if (episodes.length === 0) return res.status(404).json({ error: "No episodes found!" });

    res.json(episodes);
});

module.exports = router;
