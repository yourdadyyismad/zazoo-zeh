const express = require("express");
const puppeteer = require("puppeteer-core"); // Core version for performance
const { search } = require("yt-search");

const router = express.Router();

router.get("/", async (req, res) => {
    const query = req.query.q;

    if (!query) {
        return res.status(400).json({ error: "No query provided!" });
    }

    try {
        // 🔹 1. Search YouTube for the video
        const searchResults = await search(query);
        if (!searchResults || !searchResults.videos.length) {
            return res.status(404).json({ error: "No results found." });
        }

        const video = searchResults.videos[0]; // First result
        const videoUrl = video.url;
        
        console.log(`✅ Found YouTube video: ${videoUrl}`);

        // 🔹 2. Launch Puppeteer
        const browser = await puppeteer.launch({
            headless: true, // Change to "true" for production
            executablePath: "/usr/bin/chromium", // Adjust based on your system
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.goto("https://yt.savetube.me", { waitUntil: "domcontentloaded" });

        // 🔹 3. Input YouTube URL into the search box
        await page.type("input.search-input", videoUrl);
        console.log(`✅ Entered video URL`);

        // 🔹 4. Click "Get Video"
        await page.click("button.text-white.bg-[#fd0054]");
        console.log(`✅ Clicked "Get Video"`);

        // 🔹 5. Wait for the results section to appear
        await page.waitForSelector("#downloadSection");
        console.log(`✅ Download section loaded`);

        // 🔹 6. Select "MP3 320kbps" from the dropdown
        await page.select("#quality", "128"); // "128" represents MP3 320kbps
        console.log(`✅ Selected "MP3 320kbps"`);

        // 🔹 7. Click "Get Link"
        await page.click("button.bg-green-600");
        console.log(`✅ Clicked "Get Link"`);

        // 🔹 8. Wait for the download link to appear
        await page.waitForSelector(".download a");
        console.log(`✅ MP3 Link ready`);

        // ** DO NOT EXTRACT THE MP3 LINK YET **
        await browser.close();

        res.json({
            STATUS: 200,
            QUERY: query,
            VIDEO_TITLE: video.title,
            VIDEO_URL: videoUrl,
            VIDEO_THUMBNAIL: video.thumbnail,
            DURATION: video.timestamp,
            MESSAGE: "SaveTube automation successful. MP3 link will be extracted in the next step."
        });

    } catch (error) {
        console.error("❌ Error:", error);
        res.status(500).json({ error: "An error occurred while processing the request." });
    }
});

module.exports = router;
