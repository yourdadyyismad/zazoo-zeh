const express = require("express");
const puppeteer = require("puppeteer-core");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();
const CHROMIUM_PATH = "/usr/bin/chromium";

const scrapeNkiri = async (query) => {
    console.log(`🔍 Searching for: ${query}`);

    try {
        const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(query)}&post_type=post`;

        // 🔹 Use Axios instead of Puppeteer to get the search results
        console.log(`🌐 Fetching search results via Axios...`);
        const { data: searchHtml } = await axios.get(searchUrl);
        const $ = cheerio.load(searchHtml);

        // Extract the first movie result
        const firstResult = $(".search-entry-title a").first();
        const movieTitle = firstResult.text().trim();
        const movieLink = firstResult.attr("href");

        if (!movieLink) {
            console.error("❌ Movie not found.");
            return { error: "Movie not found" };
        }

        console.log(`🎬 Movie Found: ${movieTitle} | Link: ${movieLink}`);

        // 🔹 Use Axios again to get the movie page
        console.log(`📄 Fetching movie page via Axios...`);
        const { data: movieHtml } = await axios.get(movieLink);
        const moviePage = cheerio.load(movieHtml);

        // Extract movie description
        const description = moviePage("div.elementor-element-cb5d89d p").text().trim() || "No description available";

        // Get the intermediate download page link
        const downloadLink = moviePage(".elementor-button-wrapper a").attr("href");

        if (!downloadLink) {
            console.error("❌ Invalid download link.");
            return { title: movieTitle, description, download_link: "Invalid download link" };
        }

        console.log(`📂 Navigating to download page: ${downloadLink}`);

        // 🔹 NOW we use Puppeteer ONLY to bypass popups and click buttons
        const browser = await puppeteer.launch({
            executablePath: CHROMIUM_PATH,
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        });

        const page = await browser.newPage();
        await page.goto(downloadLink, { waitUntil: "domcontentloaded" });

        let finalDownloadLink = null;
        let retryCount = 0;
        const maxRetries = 5;

        page.on("response", async (response) => {
            const url = response.url();
            console.log(`🔄 Network Response: ${url}`);

            if (url.includes("downloadwella.com/d/") && url.endsWith(".mkv")) {
                finalDownloadLink = url;
                console.log(`✅ Final Download Link: ${finalDownloadLink}`);
            }
        });

        while (!finalDownloadLink && retryCount < maxRetries) {
            console.log(`🔁 Attempt ${retryCount + 1}: Clicking 'Create Download Link'`);
            await page.waitForSelector(".btext", { timeout: 10000 });
            await page.click(".btext");

            // Wait and check if redirected to an ad
            await page.waitForTimeout(3000);
            const currentUrl = page.url();

            if (!currentUrl.includes("downloadwella.com")) {
                console.warn(`🚨 Ad detected! Going back and retrying...`);
                await page.goBack();
                await page.waitForTimeout(2000);
            } else {
                console.log(`📥 Valid page detected, waiting for final link...`);
                await page.waitForTimeout(10000);
            }

            retryCount++;
        }

        await browser.close();

        if (!finalDownloadLink) {
            console.error("❌ Failed to get final link after retries.");
            return { title: movieTitle, description, download_link: "No final link found" };
        }

        console.log(`🎉 Success! Final Download Link: ${finalDownloadLink}`);
        return { title: movieTitle, description, download_link: finalDownloadLink };
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { error: "Something went wrong", details: error.message };
    }
};

// Route: GET /nkiri/movie?query=moana
// Route: GET /nkiri/movie?query=moana
router.get("/", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Movie query is required" });

        const movieData = await scrapeNkiri(query);

        // Add creator and status to the response
        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            ...movieData, // Spread the movie data here
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
