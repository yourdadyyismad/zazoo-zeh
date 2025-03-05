const express = require("express");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");

const router = express.Router();
const BASE_URL = "https://www.tokyoinsider.com/anime";

// Helper function to launch Puppeteer
async function launchBrowser() {
    return await puppeteer.launch({
        headless: true,
        executablePath: "/usr/bin/chromium",
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
}

// Route to scrape anime episodes
router.get("/", async (req, res) => {
    const animeName = req.query.anime; // e.g., "Solo Leveling"
    const episodeNumber = req.query.episode; // e.g., "1"

    if (!animeName) {
        console.log("❌ Missing 'anime' parameter");
        return res.status(400).json({ error: "Parameter 'anime' is required" });
    }

    console.log(`🔍 Searching for anime: ${animeName}, Episode: ${episodeNumber || "All"}`);

    try {
        const browser = await launchBrowser();
        const page = await browser.newPage();

        // 1️⃣ Open the anime search page
        console.log("🌍 Navigating to anime site...");
        await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

        // 2️⃣ Type anime name into the search bar
        console.log(`⌨️ Typing search query: ${animeName}`);
        await page.type("#search_box", animeName);

        // 3️⃣ Wait for autocomplete and select the first result
        await page.waitForTimeout(3000);
        const suggestionsExist = await page.$("ul li.ac_even, ul li.ac_odd");

        if (suggestionsExist) {
            console.log("✅ Suggestions found! Clicking the first one...");
            await page.click("ul li.ac_even, ul li.ac_odd");
        } else {
            console.log("❌ No suggestions found, pressing Enter...");
            await page.keyboard.press("Enter");
        }

        // 4️⃣ Wait for anime page to load
        console.log("➡️ Redirected to anime page. Extracting episodes...");
        await page.waitForSelector(".episode a");

        // 5️⃣ Scrape episode list
        const animeContent = await page.content();
        const $ = cheerio.load(animeContent);

        let episodes = [];
        $(".episode a").each((i, el) => {
            const title = $(el).text().trim();
            const link = `https://www.tokyoinsider.com${$(el).attr("href")}`;
            episodes.push({ title, link });
        });

        console.log(`✅ Found ${episodes.length} episodes`);
        await browser.close();

        // 6️⃣ If an episode is requested, find the exact match
        if (episodeNumber) {
            console.log(`🔍 Searching for episode ${episodeNumber}...`);

            const episode = episodes.find(e => 
                new RegExp(`\\bepisode ${episodeNumber}\\b`, "i").test(e.title)
            );

            if (!episode) {
                console.log(`❌ Episode ${episodeNumber} not found!`);
                return res.status(404).json({ error: `Episode ${episodeNumber} not found` });
            }

            console.log(`🎯 Episode found: ${episode.link}`);

            return res.json({ anime: animeName, episode: episode.title, link: episode.link });
        }

        // Return all episodes if no specific one is requested
        return res.json({ anime: animeName, episodes });

    } catch (error) {
        console.error("🚨 Error occurred:", error);
        res.status(500).json({ error: "An error occurred while scraping" });
    }
});

module.exports = router;
