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

// Route to scrape the anime website
router.get("/", async (req, res) => {
    const query = req.query.q; // e.g., "Solo Leveling S01EP01"
    
    if (!query) {
        console.log("❌ Missing query parameter 'q'");
        return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    // Extract anime title and episode number
    const animeName = query.split(" S")[0]; // Get anime title
    const episodeNumber = query.match(/EP(\d+)/i)?.[1]; // Extract episode number

    console.log(`🔍 Searching for anime: ${animeName}, Episode: ${episodeNumber}`);

    try {
        const browser = await launchBrowser();
        const page = await browser.newPage();

        // 1️⃣ Open the base anime page
        console.log("🌍 Navigating to base URL...");
        await page.goto(BASE_URL, { waitUntil: "domcontentloaded" });

        // 2️⃣ Type anime name in search bar
        console.log(`⌨️ Typing search query: ${animeName}`);
        await page.type("#search_box", animeName);

        // 3️⃣ Wait for autocomplete and click first suggestion
        await page.waitForTimeout(3000);
        const suggestionsExist = await page.$("ul li.ac_even, ul li.ac_odd");

        if (suggestionsExist) {
            console.log("✅ Suggestions found! Clicking the first one...");
            await page.click("ul li.ac_even, ul li.ac_odd");

            // Wait for episodes to load
            console.log("➡️ Redirected to anime page. Extracting episodes...");
            await page.waitForSelector(".episode a");

            // 4️⃣ Scrape episode list
            const animeContent = await page.content();
            const $$ = cheerio.load(animeContent);

            let episodes = [];
            $$(".episode a").each((i, el) => {
                const title = $$(el).text().trim();
                const link = `https://www.tokyoinsider.com${$$(el).attr("href")}`;
                episodes.push({ title, link });
            });

            console.log(`✅ Found ${episodes.length} episodes`);
            await browser.close();

            // 5️⃣ If episode number is provided, find exact match
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

                // 6️⃣ Navigate to episode page
                console.log("🌍 Navigating to episode page...");
                await page.goto(episode.link, { waitUntil: "domcontentloaded" });

                // 7️⃣ Extract download links
                console.log("📥 Extracting download links...");
                const episodeContent = await page.content();
                const $$$ = cheerio.load(episodeContent);

                let downloadLinks = [];
                $$$(".c_h2, .c_h2b").each((i, el) => {
                    const link = $$$("a", el).attr("href");
                    const sizeText = $$$(".finfo b", el).first().text();
                    const sizeMB = parseFloat(sizeText.replace(" MB", ""));

                    if (link && link.endsWith(".mkv") && !isNaN(sizeMB)) {
                        downloadLinks.push({ link, sizeMB });
                    }
                });

                if (downloadLinks.length === 0) {
                    console.log("❌ No valid download links found!");
                    await browser.close();
                    return res.status(404).json({ error: "No valid download links found" });
                }

                // 8️⃣ Find the smallest file
                console.log(`📊 Found ${downloadLinks.length} download links, selecting the smallest...`);
                const smallestFile = downloadLinks.reduce((prev, curr) => (prev.sizeMB < curr.sizeMB ? prev : curr));

                console.log(`✅ Smallest file selected: ${smallestFile.link} (${smallestFile.sizeMB} MB)`);

                await browser.close();
                return res.json({ episode: episode.title, download: smallestFile.link });
            }

            return res.json({ anime: animeName, episodes });
        } else {
            console.log("❌ No suggestions found. Continuing normal search...");
            await page.keyboard.press("Enter");

            // 9️⃣ Wait for search results and extract first anime link
            await page.waitForSelector(".c_h2 a");
            console.log("🔗 Extracting first search result...");
            const content = await page.content();
            const $ = cheerio.load(content);
            const animeLink = $(".c_h2 a").first().attr("href");

            if (!animeLink) {
                console.log("❌ Anime not found!");
                await browser.close();
                return res.status(404).json({ error: "Anime not found" });
            }

            const animePageUrl = `https://www.tokyoinsider.com${animeLink}`;
            console.log(`✅ Anime found: ${animePageUrl}`);

            // 🔟 Navigate to anime page
            console.log("🌍 Opening anime page...");
            await page.goto(animePageUrl, { waitUntil: "domcontentloaded" });

            // 1️⃣1️⃣ Scrape episodes
            console.log("📜 Scraping episode list...");
            const animeContent = await page.content();
            const $$ = cheerio.load(animeContent);

            let episodes = [];
            $$(".episode a").each((i, el) => {
                const title = $$(el).text().trim();
                const link = `https://www.tokyoinsider.com${$$(el).attr("href")}`;
                episodes.push({ title, link });
            });

            if (episodes.length === 0) {
                console.log("❌ No episodes found!");
                await browser.close();
                return res.status(404).json({ error: "No episodes found" });
            }

            console.log(`✅ Found ${episodes.length} episodes`);

            // 1️⃣2️⃣ Find specific episode
            let episode;
            if (episodeNumber) {
                episode = episodes.find(e => 
                    new RegExp(`\\bepisode ${episodeNumber}\\b`, "i").test(e.title)
                );

                if (!episode) {
                    console.log(`❌ Episode ${episodeNumber} not found!`);
                    await browser.close();
                    return res.status(404).json({ error: `Episode ${episodeNumber} not found` });
                }

                console.log(`🎯 Episode found: ${episode.link}`);
            } else {
                console.log("ℹ️ No specific episode requested, returning all episodes");
                await browser.close();
                return res.json({ anime: animeName, episodes });
            }

            await browser.close();
            return res.json({ episode: episode.title, link: episode.link });
        }

    } catch (error) {
        console.error("🚨 Error occurred:", error);
        res.status(500).json({ error: "An error occurred while scraping" });
    }
});

module.exports = router;
