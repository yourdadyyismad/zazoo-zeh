const express = require("express");
const puppeteer = require("puppeteer-core");
const { search } = require("yt-search");

const router = express.Router();

async function scrapeSaveTube(videoUrl) {
    const browser = await puppeteer.launch({
        headless: true, // Set to true in production
        executablePath: "/usr/bin/chromium", // Change based on OS
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.goto("https://yt.savetube.me", { waitUntil: "domcontentloaded" });

    // Input the video URL into the search field
    await page.waitForSelector(".search-input");
    await page.type(".search-input", videoUrl);
    await page.keyboard.press("Enter");

    // Wait for the download section to appear
    await page.waitForSelector("#downloadSection");

    // Select MP3 320kbps
    await page.waitForSelector("#quality");
    await page.select("#quality", "128"); // Select MP3 320kbps

    // Click "Get Link"
    await page.waitForSelector(".bg-green-600");
    await page.click(".bg-green-600");

    // Wait for the new page to load
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });

    // Get the new page URL
    const newPageUrl = page.url();

    await browser.close();
    return newPageUrl;
}

router.get("/", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: "No query provided!" });
    }

    try {
        // Search YouTube and get the first video result
        const searchResults = await search(query);
        if (!searchResults || !searchResults.videos.length) {
            return res.status(404).json({ error: "No results found." });
        }

        const video = searchResults.videos[0];
        const videoUrl = video.url;

        // Scrape SaveTube
        const saveTubePage = await scrapeSaveTube(videoUrl);

        res.json({
            STATUS: 200,
            QUERY: query,
            VIDEO_TITLE: video.title,
            VIDEO_URL: videoUrl,
            VIDEO_THUMBNAIL: video.thumbnail,
            DURATION: video.timestamp,
            SAVETUBE_URL: saveTubePage, // This is the page where the final MP3 link is located
        });

    } catch (error) {
        console.error("Error scraping SaveTube:", error);
        res.status(500).json({ error: "An error occurred while processing the request." });
    }
});

module.exports = router;
