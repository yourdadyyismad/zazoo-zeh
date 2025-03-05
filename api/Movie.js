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
    const query = req.query.q; // e.g., "Attack on Titan S01EP01"
    
    if (!query) {
        console.log("❌ Missing query parameter 'q'");
        return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const animeName = query.split(" S")[0]; // Extract anime title
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

        // 3️⃣ Wait for suggestions to appear
        await page.waitForTimeout(3000);
        const suggestionsExist = await page.$("ul li.ac_even, ul li.ac_odd");

        if (suggestionsExist) {
            console.log("✅ Suggestions found! Clicking the first one...");
            await page.click("ul li.ac_even, ul li.ac_odd");
        } else {
            console.log("❌ No suggestions found. Pressing Enter...");
            await page.keyboard.press("Enter");
            await page.waitForSelector(".c_h2 a");
            
            // Extract first anime result link
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

            // Open anime page
            await page.goto(animePageUrl, { waitUntil: "domcontentloaded" });
        }

        // 4️⃣ Extract episode list
        console.log("📜 Scraping episode list...");
        const animeContent = await page.content();
        const $$ = cheerio.load(animeContent);

        let episodes = [];
        $$(".episode a").each((i, el) => {
            const title = $$(el).text().trim().toLowerCase();
            const link = `https://www.tokyoinsider.com${$$(el).attr("href")}`;

            // Remove unwanted links like "upload"
            if (!title.includes("upload")) {
                episodes.push({ title, link });
            }
        });

        console.log(`✅ Found ${episodes.length} episodes`);

        // 5️⃣ Find exact episode match
        if (episodeNumber) {
            const episode = episodes.find(e => e.title === `attack on titan episode ${episodeNumber}`);

            if (!episode) {
                console.log(`❌ Episode ${episodeNumber} not found!`);
                await browser.close();
                return res.status(404).json({ error: `Episode ${episodeNumber} not found` });
            }

            console.log(`🎯 Episode found: ${episode.link}`);

            // 6️⃣ Navigate to episode page
            console.log("🌍 Navigating to episode page...");
            await page.goto(episode.link, { waitUntil: "domcontentloaded" });

            // 🔟 Extract download links
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

            // 1️⃣1️⃣ Select the smallest file
            console.log(`📊 Found ${downloadLinks.length} download links, selecting the smallest...`);
            const smallestFile = downloadLinks.reduce((prev, curr) => (prev.sizeMB < curr.sizeMB ? prev : curr));

            console.log(`✅ Smallest file selected: ${smallestFile.link} (${smallestFile.sizeMB} MB)`);

            await browser.close();
            return res.json({ episode: episode.title, download: smallestFile.link });
        }

        await browser.close();
        return res.json({ anime: animeName, episodes });

    } catch (error) {
        console.error("🚨 Error occurred:", error);
        res.status(500).json({ error: "An error occurred while scraping" });
    }
});

module.exports = router;
