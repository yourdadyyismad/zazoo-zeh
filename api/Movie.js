const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-core");

const router = express.Router();
const BASE_URL = "https://www.letras.com";
const CHROMIUM_PATH = "/usr/bin/chromium"; // Adjust if needed

// **Main Route**
router.get("/", async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing 'q' parameter" });

    console.log(`🔍 Searching for: ${query}`);

    try {
        // **Step 1: Fetch search results via Axios + Cheerio**
        const searchUrl = `${BASE_URL}/?q=${encodeURIComponent(query)}`;
        console.log(`🌍 Fetching search results: ${searchUrl}`);

        const { data: searchHtml } = await axios.get(searchUrl);
        const $ = cheerio.load(searchHtml);

        // **Extract first song link**
        const firstResult = $(".gs-title a.gs-title").first();
        const firstResultUrl = firstResult.attr("href");

        if (!firstResultUrl) {
            console.log("❌ No search results found.");
            return res.status(404).json({ error: "No search results found" });
        }

        const songUrl = firstResultUrl.startsWith("http") ? firstResultUrl : `${BASE_URL}${firstResultUrl}`;
        console.log(`🔗 Song URL: ${songUrl}`);

        // **Step 2: Fetch song page with Puppeteer**
        console.log(`🌍 Fetching song page: ${songUrl}`);
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: CHROMIUM_PATH,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.goto(songUrl, { waitUntil: "networkidle2", timeout: 30000 });

        console.log("✅ Song page loaded.");

        // **Step 3: Extract lyrics and image**
        const { lyrics, imageUrl } = await page.evaluate(() => {
            const lyricsContainer = document.querySelector("article#js-lyric-content");
            const lyricsText = lyricsContainer ? lyricsContainer.innerText.trim() : null;

            // Extract image from `data-lazy` or fallback to `src`
            const imageElement = document.querySelector(".thumbnail img");
            const imageUrl = imageElement 
                ? (imageElement.getAttribute("data-lazy") || imageElement.getAttribute("src")) 
                : null;

            return { lyrics: lyricsText, imageUrl };
        });

        await browser.close();

        if (!lyrics) {
            console.log("❌ Lyrics not found.");
            return res.status(404).json({ error: "Lyrics not found" });
        }

        console.log("📜 Lyrics found:", lyrics.substring(0, 100) + "...");
        console.log("🖼️ Image URL:", imageUrl || "No image found");

        return res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            query,
            songUrl,
            lyrics,
            imageUrl
        });

    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        return res.status(500).json({ error: "Internal server error", details: error.message });
    }
});

module.exports = router;
