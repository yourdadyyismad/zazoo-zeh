const express = require("express");
const puppeteer = require("puppeteer-core");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();
const CHROMIUM_PATH = "/usr/bin/chromium";
const creator = "DRACULA"; // ✅ Added Creator

// ✅ Existing movie scraper function remains unchanged
const scrapeNkiri = async (query) => {
    console.log(`🔍 Searching for: ${query}`);

    try {
        const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(query)}&post_type=post`;

        console.log(`🌐 Fetching search results via Axios...`);
        const { data: searchHtml } = await axios.get(searchUrl);
        const $ = cheerio.load(searchHtml);

        // Extract the first result
        const firstResult = $(".search-entry-title a").first();
        const movieTitle = firstResult.text().trim();
        const movieLink = firstResult.attr("href");

        if (!movieLink) {
            console.error("❌ Movie not found.");
            return { creator, STATUS: 404, error: "Movie not found" };
        }

        console.log(`🎬 Movie Found: ${movieTitle} | Link: ${movieLink}`);

        console.log(`📄 Fetching movie page via Axios...`);
        const { data: movieHtml } = await axios.get(movieLink);
        const moviePage = cheerio.load(movieHtml);

        // Extract movie description
        const description = moviePage("div.elementor-element-cb5d89d p").text().trim() || "No description available";

        // Get the intermediate download page link
        const downloadLink = moviePage(".elementor-button-wrapper a").attr("href");

        if (!downloadLink) {
            console.error("❌ Invalid download link.");
            return { creator, STATUS: 400, title: movieTitle, description, download_link: "Invalid download link" };
        }

        console.log(`📂 Navigating to download page: ${downloadLink}`);

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
            return { creator, STATUS: 404, title: movieTitle, description, download_link: "No final link found" };
        }

        console.log(`🎉 Success! Final Download Link: ${finalDownloadLink}`);
        return { creator, STATUS: 200, title: movieTitle, description, download_link: finalDownloadLink };
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { creator, STATUS: 500, error: "Something went wrong", details: error.message };
    }
};

// ✅ Updated scrapeEpisode function with `creator`, `STATUS`, and `episode`
const scrapeEpisode = async (query) => {
    console.log(`🔍 Searching for: ${query}`);

    try {
        const episodeMatch = query.match(/S\d+EP(\d+)/i);
        if (!episodeMatch) {
            console.error("❌ Invalid episode format.");
            return { creator, STATUS: 400, error: "Invalid episode format. Use S01EP01 format." };
        }

        const episodeNumber = parseInt(episodeMatch[1], 10);
        const searchQuery = query.replace(/S\d+EP\d+/i, "").trim();
        const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(searchQuery)}&post_type=post`;

        console.log(`🌐 Fetching search results via Axios...`);
        const { data: searchHtml } = await axios.get(searchUrl);
        const $ = cheerio.load(searchHtml);

        const firstResult = $(".search-entry-title a").first();
        const showTitle = firstResult.text().trim();
        const showLink = firstResult.attr("href");

        if (!showLink) {
            console.error("❌ Show not found.");
            return { creator, STATUS: 404, error: "Show not found" };
        }

        console.log(`📺 Show Found: ${showTitle} | Link: ${showLink}`);

        console.log(`📄 Fetching show page via Axios...`);
        const { data: showHtml } = await axios.get(showLink);
        const showPage = cheerio.load(showHtml);

        let episodeDownloadPage = null;
        let foundEpisodeTitle = null;

        showPage("section.elementor-section").each((_, element) => {
            const episodeTitle = showPage(element).find("h2.elementor-heading-title").text().trim();
            const episodeDownloadHref = showPage(element).find(".elementor-button-wrapper a").attr("href");

            if (episodeTitle.toLowerCase() === `episode ${episodeNumber}`.toLowerCase()) {
                episodeDownloadPage = episodeDownloadHref;
                foundEpisodeTitle = `Solo.Leveling.S01E${String(episodeNumber).padStart(2, "0")}`;
                return false;
            }
        });

        if (!episodeDownloadPage) {
            console.error("❌ Episode not found.");
            return { creator, STATUS: 404, error: "Episode not found" };
        }

        console.log(`📂 Episode Found: ${foundEpisodeTitle} | Navigating to download page: ${episodeDownloadPage}`);

        return { creator, STATUS: 200, title: foundEpisodeTitle, episode: episodeNumber, download_link: episodeDownloadPage };
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { creator, STATUS: 500, error: "Something went wrong", details: error.message };
    }
};

// ✅ New endpoint for getting an episode  
router.get("/episode", async (req, res) => {  
    try {  
        const { query } = req.query;  
        if (!query) return res.status(400).json({ creator, STATUS: 400, error: "Episode query is required" });

        const episodeData = await scrapeEpisode(query);  
        return res.json(episodeData);  
    } catch (error) {  
        console.error("❌ Error:", error.message);  
        return res.status(500).json({ creator, STATUS: 500, error: "Internal Server Error" });
    }  
});

// ✅ Existing endpoint for movies remains unchanged
router.get("/", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ creator, STATUS: 400, error: "Movie query is required" });

        const movieData = await scrapeNkiri(query);
        return res.json(movieData);
    } catch (error) {
        console.error("❌ Error:", error.message);
        return res.status(500).json({ creator, STATUS: 500, error: "Internal Server Error" });
    }
});

module.exports = router;
