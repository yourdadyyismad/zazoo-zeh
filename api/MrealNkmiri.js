
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

        // 🌐 Fetch search results using Axios
        console.log(`🌍 Fetching search results via Axios...`);
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

        console.log(`🎬 Movie Found: ${movieTitle}`);
        console.log(`🔗 Link: ${movieLink}`);

        // 📄 Fetch movie page using Axios
        console.log(`📜 Fetching movie page...`);
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

        console.log(`📥 Navigating to download page: ${downloadLink}`);

        // 🚀 Launch Puppeteer to handle popups and button clicks
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
                console.log(`📌 Valid page detected, waiting for final link...`);
                await page.waitForTimeout(10000);
            }

            retryCount++;
        }

        await browser.close();

        if (!finalDownloadLink) {
            console.error("❌ Failed to get final link after retries.");
            return { title: movieTitle, description, download_link: "No final link found" };
        }

        console.log(`🎉 Success!`);
        console.log(`🎬 Title: ${movieTitle}`);
        console.log(`🔗 Download Link: ${finalDownloadLink}`);

        return { title: movieTitle, description, download_link: finalDownloadLink };
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { error: "Something went wrong", details: error.message };
    }
};

 const scrapeEpisode = async (query) => { 
    console.log(`🔍 Searching for Episode: ${query}`);

    try {
        // Convert query to just "Solo Leveling S01" for search
        const searchQuery = query.replace(/S\d+EP\d+/i, "S01");
        const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(searchQuery)}&post_type=post`;

        console.log(`🌐 Fetching search results...`);
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

        console.log(`📺 Found Show: ${showTitle} | Link: ${showLink}`);

        console.log(`📄 Fetching show page...`);
        const { data: showHtml } = await axios.get(showLink);
        const showPage = cheerio.load(showHtml);

        // Extract episode number from query (e.g., S01EP01 -> Episode 1)
        const episodeMatch = query.match(/S\d+EP(\d+)/i);
        if (!episodeMatch) {
            console.error("❌ Invalid episode format.");
            return { error: "Invalid episode format. Use S01EP01 format." };
        }
        const episodeNumber = parseInt(episodeMatch[1], 10);

        let episodeDownloadPage = null;
        let foundEpisodeTitle = null;

        // Search for the correct episode
        showPage("section.elementor-section").each((_, element) => {
            const episodeTitle = showPage(element).find("h2.elementor-heading-title").text().trim();
            const downloadHref = showPage(element).find(".elementor-button-wrapper a").attr("href");

            if (episodeTitle.toLowerCase() === `episode ${episodeNumber}`.toLowerCase()) {
                episodeDownloadPage = downloadHref;
                foundEpisodeTitle = `${showTitle} - ${episodeTitle}`; // ✅ Updated Title Format
                return false; // Stop looping once found
            }
        });

        if (!episodeDownloadPage) {
            console.error("❌ Episode not found.");
            return { error: "Episode not found" };
        }

        console.log(`📂 Found Download Page: ${episodeDownloadPage}`);

        // Launch Puppeteer to get the final download link
        console.log(`🚀 Launching Puppeteer...`);
        const browser = await puppeteer.launch({
            executablePath: CHROMIUM_PATH,
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        });

        const page = await browser.newPage();
        await page.goto(episodeDownloadPage, { waitUntil: "domcontentloaded" });

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
            return { title: foundEpisodeTitle, download_link: "No final link found" };
        }

        console.log(`🎉 Success! Final Download Link: ${finalDownloadLink}`);
        return { title: foundEpisodeTitle, download_link: finalDownloadLink };
    } catch (error) {
        console.error("❌ Error:", error.message);
        return { error: "Something went wrong", details: error.message };
    }
};

// ✅ New endpoint to get an episode  
router.get("/episode", async (req, res) => {  
    try {  
        const { query } = req.query;  
        if (!query) return res.status(400).json({ error: "Episode query is required" });  

        const episodeData = await scrapeEpisode(query);  
        res.json({
            CREATOR: "DRACULA",
            STATUS: 200,
            ...episodeData, // Spread the movie data here
        });
;  
    } catch (error) {  
        console.error("❌ Error:", error.message);  
        return res.status(500).json({ error: "Internal Server Error" });  
    }  
});

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
        console.error("âŒ Server error:", error.message);
        res.status(500).json({ 
            CREATOR: "DRACULA",
            STATUS: 500,
            error: "Something went wrong", 
            details: error.message 
        });
    }
});

module.exports = router;
