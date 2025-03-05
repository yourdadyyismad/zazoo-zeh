const express = require("express");
const puppeteer = require("puppeteer-core");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();
const CHROMIUM_PATH = "/usr/bin/chromium";

// Existing movie scraper function remains unchanged
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
            return { error: "Movie not found" };
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
            return { title: movieTitle, description, download_link: "Invalid download link" };
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
            return { title: movieTitle, description, download_link: "No final link found" };
        }

        console.log(`🎉 Success! Final Download Link: ${finalDownloadLink}`);
        return { title: movieTitle, description, download_link: finalDownloadLink };
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { error: "Something went wrong", details: error.message };
    }
};

// ✅ Improved function to scrape all episodes
const scrapeEpisode = async (query) => { 
    console.log(`🔍 Searching for Episode: ${query}`);

    try {
        const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(query)}&post_type=post`;
        const { data: searchHtml } = await axios.get(searchUrl);
        const $ = cheerio.load(searchHtml);

        // Extract the first search result
        const firstResult = $(".search-entry-title a").first();
        const showTitle = firstResult.text().trim();
        const showLink = firstResult.attr("href");

        if (!showLink) {
            console.error("❌ Show not found.");
            return { error: "Show not found" };
        }

        console.log(`📺 Show Found: ${showTitle} | Link: ${showLink}`);

        // Get the episode list from the series page
        const { data: showHtml } = await axios.get(showLink);
        const showPage = cheerio.load(showHtml);

        let episodes = [];

        // Extract all episodes
        showPage("section.elementor-section").each((_, element) => {
            const episodeTitle = showPage(element).find("h2.elementor-heading-title").text().trim();
            const downloadHref = showPage(element).find(".elementor-button-wrapper a").attr("href");

            if (episodeTitle && downloadHref) {
                episodes.push({
                    episode: episodeTitle.replace("Episode ", "").trim(),  // Extract episode number
                    download_link: downloadHref
                });
            }
        });

        if (episodes.length === 0) {
            console.error("❌ No episodes found.");
            return { error: "No episodes found" };
        }

        // If the user is searching for a specific episode (e.g., "Solo Leveling S01Ep01")
        if (query.toLowerCase().includes("ep")) {
            const episodeNumber = query.match(/\d+$/)?.[0]; // Extract episode number from query
            const specificEpisode = episodes.find(ep => ep.episode === episodeNumber);

            if (!specificEpisode) {
                console.error("❌ Episode not found.");
                return { error: "Episode not found" };
            }

            console.log(`✅ Episode ${episodeNumber} Link Found: ${specificEpisode.download_link}`);

            return {
                title: showTitle,
                episode: episodeNumber,
                download_link: specificEpisode.download_link
            };
        }

        // If the user is searching for the full season
        console.log(`✅ Returning all ${episodes.length} episodes.`);
        return { title: showTitle, episodes };
        
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { error: "Something went wrong", details: error.message };
    }
};
// ✅ **New endpoint to get an episode**
router.get("/episode", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Episode query is required" });

        const episodeData = await scrapeEpisode(query);
        return res.json(episodeData);
    } catch (error) {
        console.error("❌ Error:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ **Existing endpoint for movies remains unchanged**
router.get("/", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Movie query is required" });

        const movieData = await scrapeNkiri(query);
        return res.json(movieData);
    } catch (error) {
        console.error("❌ Error:", error.message);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
