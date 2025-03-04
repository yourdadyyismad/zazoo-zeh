const express = require("express");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");

const router = express.Router();

const launchOptions = {
    headless: true,
    executablePath: "/usr/bin/chromium", // Your Chromium path
    args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
    ],
};

router.get("/", async (req, res) => {
    try {
        const videoURL = req.query.url;
        if (!videoURL || !videoURL.includes("tiktok.com")) {
            return res.status(400).json({ error: "Invalid or missing TikTok URL" });
        }

        console.log("Launching browser...");
        const browser = await puppeteer.launch(launchOptions);
        const page = await browser.newPage();

        console.log("Opening TikTok video page...");
        await page.goto(videoURL, { waitUntil: "networkidle2" });

        // Extract page content
        const html = await page.content();
        const $ = cheerio.load(html);

        // Extract video info
        const username = $("a[href*='/@']").first().text().trim();
        const profilePic = $("img[alt='User avatar']").attr("src");
        const caption = $("h1").text().trim();
        const videoElement = $("video").attr("src");

        if (!videoElement) {
            await browser.close();
            return res.status(404).json({ error: "Failed to find video URL" });
        }

        console.log("Extracting no-watermark video URL...");
        const videoNoWatermark = videoElement.replace(/playwm/, "play");

        await browser.close();

        res.json({
            STATUS: 200,
            MESSAGE: "TikTok video details fetched successfully",
            USERNAME: username || "Unknown",
            PROFILE_PICTURE: profilePic || "Not found",
            CAPTION: caption || "No caption",
            VIDEO_URL_WATERMARK: videoElement,
            VIDEO_URL_NO_WATERMARK: videoNoWatermark,
            ORIGINAL_URL: videoURL,
        });

    } catch (error) {
        console.error("Error fetching TikTok video details:", error);
        res.status(500).json({ error: "Failed to fetch video details" });
    }
});

module.exports = router;
