const express = require("express");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");

const router = express.Router();

router.get("/", async (req, res) => {
    const videoURL = req.query.url;

    if (!videoURL || !videoURL.includes("tiktok.com")) {
        return res.status(400).json({ error: "Invalid or missing TikTok URL" });
    }

    try {
        console.log("Launching browser...");
        const browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu",
            ],
        });

        const page = await browser.newPage();

        // 🛑 Make Puppeteer Look Like a Real User
        await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
        await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

        console.log("Opening TikTok video page...");
        await page.goto(videoURL, { waitUntil: "networkidle2", timeout: 30000 });

        // Wait for video to load
        await page.waitForSelector("video", { timeout: 5000 });

        // Get page content
        const html = await page.content();
        const $ = cheerio.load(html);

        // Extract video details
        const username = $("a[href*='/@']").first().text().trim();
        const profilePic = $("img[alt='User avatar']").attr("src");
        const caption = $("h1").text().trim();
        const likeCount = $("strong[data-e2e='like-count']").text().trim();
        const commentCount = $("strong[data-e2e='comment-count']").text().trim();
        const shareCount = $("strong[data-e2e='share-count']").text().trim();
        const viewCount = $("strong[data-e2e='play-count']").text().trim();
        const videoElement = await page.$eval("video", (vid) => vid.src);
        const thumbnail = $("meta[property='og:image']").attr("content");

        await browser.close();

        res.json({
            STATUS: 200,
            MESSAGE: "TikTok video details fetched successfully",
            USERNAME: username || "Unknown",
            PROFILE_PICTURE: profilePic || "Not found",
            CAPTION: caption || "No caption",
            LIKE_COUNT: likeCount || "0",
            COMMENT_COUNT: commentCount || "0",
            SHARE_COUNT: shareCount || "0",
            VIEW_COUNT: viewCount || "0",
            VIDEO_URL: videoElement,
            THUMBNAIL: thumbnail || "Not found",
            ORIGINAL_URL: videoURL,
        });

    } catch (error) {
        console.error("Error fetching TikTok video details:", error);
        res.status(500).json({ error: "Failed to fetch video details" });
    }
});

module.exports = router;
