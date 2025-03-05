const express = require("express");
const puppeteer = require("puppeteer-core");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();
const CHROMIUM_PATH = "/usr/bin/chromium";
const BASE_URL = "https://www.tokyoinsider.com/anime";

/**
 * Scrape anime details from Tokyo Insider
 */
const scrapeAnime = async (query) => {
    console.log(`🔍 Searching for Anime: ${query}`);

    try {
        const searchUrl = BASE_URL;
        console.log(`🌍 Fetching search page: ${searchUrl}`);

        // 🚀 Launch Puppeteer
        const browser = await puppeteer.launch({
            executablePath: CHROMIUM_PATH,
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

        // Type query into search box
        console.log(`⌨️ Typing search query: ${query}`);
        await page.type("#search_box", query);
        await page.waitForTimeout(3000);

        // Check for search results
        const hasResults = await page.$("ul li.ac_even, ul li.ac_odd");

        if (!hasResults) {
            console.log("❌ No search suggestions found.");
            await browser.close();
            return { error: "Anime not found" };
        }

        // Click the first search result
        console.log("✅ Clicking the first search result...");
        await page.click("ul li.ac_even, ul li.ac_odd");

        // Wait for episodes to load
        await page.waitForSelector(".episode a");

        // Scrape episode list
        const animeHtml = await page.content();
        const $ = cheerio.load(animeHtml);

        let episodes = [];
        $(".episode a").each((_, el) => {
            const title = $(el).text().trim();
            const link = `https://www.tokyoinsider.com${$(el).attr("href")}`;
            episodes.push({ title, link });
        });

        console.log(`✅ Found ${episodes.length} episodes.`);
        await browser.close();

        return { title: query, episodes };
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { error: "Something went wrong", details: error.message };
    }
};

/**
 * Scrape anime episode download link
 */
const scrapeEpisode = async (query) => {
    console.log(`🔍 Searching for Episode: ${query}`);

    try {
        // Extract anime title and episode number
        const animeName = query.split(" S")[0];
        const episodeMatch = query.match(/EP(\d+)/i);
        if (!episodeMatch) {
            console.error("❌ Invalid episode format.");
            return { error: "Invalid episode format. Use S01EP01 format." };
        }
        const episodeNumber = parseInt(episodeMatch[1], 10);
        console.log(`🎬 Anime: ${animeName}, Episode: ${episodeNumber}`);

        // Scrape anime page first
        const animeData = await scrapeAnime(animeName);
        if (animeData.error) return animeData;

        // Find the specific episode link
        const episode = animeData.episodes.find(e =>
            new RegExp(`\\bepisode ${episodeNumber}\\b`, "i").test(e.title)
        );

        if (!episode) {
            console.error(`❌ Episode ${episodeNumber} not found.`);
            return { error: "Episode not found" };
        }

        console.log(`📥 Navigating to episode page: ${episode.link}`);

        // 🚀 Launch Puppeteer for download extraction
        const browser = await puppeteer.launch({
            executablePath: CHROMIUM_PATH,
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.goto(episode.link, { waitUntil: "domcontentloaded" });

        // Scrape download links
        const episodeHtml = await page.content();
        const $ = cheerio.load(episodeHtml);

        let downloadLinks = [];
        $(".c_h2, .c_h2b").each((_, el) => {
            const link = $("a", el).attr("href");
            const sizeText = $(".finfo b", el).first().text();
            const sizeMB = parseFloat(sizeText.replace(" MB", ""));

            if (link && link.endsWith(".mkv") && !isNaN(sizeMB)) {
                downloadLinks.push({ link, sizeMB });
            }
        });

        await browser.close();

        if (downloadLinks.length === 0) {
            console.error("❌ No valid download links found.");
            return { error: "No valid download links found" };
        }

        // Find the smallest file
        const smallestFile = downloadLinks.reduce((prev, curr) =>
            prev.sizeMB < curr.sizeMB ? prev : curr
        );

        console.log(`✅ Smallest file selected: ${smallestFile.link} (${smallestFile.sizeMB} MB)`);

        return { title: episode.title, download_link: smallestFile.link };
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { error: "Something went wrong", details: error.message };
    }
};

// ✅ Anime search endpoint
router.get("/", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Anime query is required" });

        const animeData = await scrapeAnime(query);

        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            ...animeData
        });
    } catch (error) {
        console.error("❌ Server error:", error.message);
        res.status(500).json({
            CREATOR: "DRACULA",
            STATUS: 500,
            error: "Something went wrong",
            details: error.message
        });
    }
});

// ✅ Episode download endpoint
router.get("/episode", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Episode query is required" });

        const episodeData = await scrapeEpisode(query);

        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            ...episodeData
        });
    } catch (error) {
        console.error("❌ Server error:", error.message);
        res.status(500).json({
            CREATOR: "DRACULA",
            STATUS: 500,
            error: "Something went wrong",
            details: error.message
        });
    }
});

module.exports = router;
