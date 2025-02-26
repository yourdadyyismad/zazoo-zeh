const express = require('express');
const puppeteer = require('puppeteer-core');

const router = express.Router();

router.get('/', async (req, res) => {
    const userQuery = req.query.q;

    if (!userQuery) {
        return res.status(400).json({ error: "No query provided!" });
    }

    try {
        // Format query for URL
        const formattedQuery = encodeURIComponent(userQuery);
        const searchUrl = `https://www.xvideos.com/?k=${formattedQuery}`;

        // Launch Puppeteer
        const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium', // Make sure this points to the installed Chromium
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
        const page = await browser.newPage();

        // Navigate to search URL
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });

        // Extract data using Puppeteer instead of Cheerio
        const result = await page.evaluate(() => {
    const firstVideoElement = document.querySelector('.thumb-block .thumb a');
    const firstImageElement = document.querySelector('.thumb-block .thumb img');
    const videoPreviewElement = document.querySelector('.thumb-block .videopv video');

    return {
        videoUrl: firstVideoElement ? `https://www.xvideos.com${firstVideoElement.getAttribute('href')}` : null,
        thumbnail: firstImageElement ? firstImageElement.getAttribute('data-src') || firstImageElement.getAttribute('src') : null,
        videoPreview: videoPreviewElement ? videoPreviewElement.getAttribute('src') : null
    };
});

        // Close Puppeteer
        await browser.close();

        if (!result.videoUrl) {
            return res.status(404).json({ error: "No results found" });
        }

        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            QUERY: userQuery,
            SEARCH_URL: searchUrl,
            VIDEO_URL: result.videoUrl,
            THUMBNAIL: result.thumbnail || "No image found",
            TEST: result.videoPreview || "No preview video found"
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
