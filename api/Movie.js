const express = require("express");
const puppeteer = require("puppeteer-core");
const axios = require("axios");
const cheerio = require("cheerio");

const router = express.Router();
const CHROMIUM_PATH = "/usr/bin/chromium";

const scrapeNkiri = async (query) => {
    console.log(`🔍 Searching for movie: ${query}`);

    try {
        const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(query)}&post_type=post`;
        const { data: searchHtml } = await axios.get(searchUrl);
        const $ = cheerio.load(searchHtml);

        const firstResult = $(".search-entry-title a").first();
        const movieTitle = firstResult.text().trim();
        const movieLink = firstResult.attr("href");

        if (!movieLink) return { error: "Movie not found" };

        console.log(`🎬 Found: ${movieTitle}`);

        const { data: movieHtml } = await axios.get(movieLink);
        const moviePage = cheerio.load(movieHtml);
        const description = moviePage("div.elementor-element-cb5d89d p").text().trim() || "No description available";
        const downloadLink = moviePage(".elementor-button-wrapper a").attr("href");

        if (!downloadLink) return { title: movieTitle, description, download_link: "Invalid download link" };

        console.log(`📂 Navigating to download page...`);

        const browser = await puppeteer.launch({
            executablePath: CHROMIUM_PATH,
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        });

        const page = await browser.newPage();
        await page.goto(downloadLink, { waitUntil: "domcontentloaded" });

        let finalDownloadLink = null;
        page.on("response", async (response) => {
            const url = response.url();
            if (url.includes("downloadwella.com/d/") && url.endsWith(".mkv")) finalDownloadLink = url;
        });

        await page.waitForTimeout(10000);
        await browser.close();

        if (!finalDownloadLink) return { title: movieTitle, description, download_link: "No final link found" };

        console.log(`✅ Final Download Link Found`);
        return { creator: "DRACULA", STATUS: 200, title: movieTitle, description, download_link: finalDownloadLink };
    } catch (error) {
        return { error: "Something went wrong", details: error.message };
    }
};

const scrapeEpisode = async (query) => {
    console.log(`🔍 Searching for series: ${query}`);

    try {
        const episodeMatch = query.match(/S\d+EP(\d+)/i);
        if (!episodeMatch) return { error: "Invalid episode format. Use S01EP01 format." };

        const episodeNumber = parseInt(episodeMatch[1], 10);
        const searchQuery = query.replace(/S\d+EP\d+/i, "").trim();
        const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(searchQuery)}&post_type=post`;

        const { data: searchHtml } = await axios.get(searchUrl);
        const $ = cheerio.load(searchHtml);

        const firstResult = $(".search-entry-title a").first();
        const showTitle = firstResult.text().trim();
        const showLink = firstResult.attr("href");

        if (!showLink) return { error: "Show not found" };

        console.log(`📺 Found: ${showTitle}`);

        const { data: showHtml } = await axios.get(showLink);
        const showPage = cheerio.load(showHtml);

        let episodeDownloadPage = null;
        let foundEpisodeTitle = `Solo.Leveling.S01E${String(episodeNumber).padStart(2, "0")}`;

        showPage("section.elementor-section").each((_, element) => {
            const episodeTitle = showPage(element).find("h2.elementor-heading-title").text().trim();
            const episodeDownloadHref = showPage(element).find(".elementor-button-wrapper a").attr("href");

            if (episodeTitle.toLowerCase() === `episode ${episodeNumber}`.toLowerCase()) {
                episodeDownloadPage = episodeDownloadHref;
                return false;
            }
        });

        if (!episodeDownloadPage) return { error: "Episode not found" };

        console.log(`📂 Navigating to Episode ${episodeNumber} download page...`);

        const browser = await puppeteer.launch({
            executablePath: CHROMIUM_PATH,
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
        });

        const page = await browser.newPage();
        await page.goto(episodeDownloadPage, { waitUntil: "domcontentloaded" });

        let finalDownloadLink = null;
        page.on("response", async (response) => {
            const url = response.url();
            if (url.includes("downloadwella.com/d/") && url.endsWith(".mkv")) finalDownloadLink = url;
        });

        await page.waitForTimeout(10000);
        await browser.close();

        if (!finalDownloadLink) return { error: "No final link found" };

        console.log(`✅ Final Download Link Found`);
        return { creator: "DRACULA", STATUS: 200, title: foundEpisodeTitle, episode: episodeNumber, download_link: finalDownloadLink };
    } catch (error) {
        return { error: "Something went wrong", details: error.message };
    }
};

router.get("/episode", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Episode query is required" });

        const episodeData = await scrapeEpisode(query);
        return res.json(episodeData);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

router.get("/", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Movie query is required" });

        const movieData = await scrapeNkiri(query);
        return res.json(movieData);
    } catch (error) {
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

module.exports = router;
