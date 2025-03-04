const express = require("express");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");

const router = express.Router();
const CHROMIUM_PATH = "/usr/bin/chromium";

// Function to scrape Nkiri and get the final movie download link
const scrapeNkiri = async (query) => {
    const browser = await puppeteer.launch({
        executablePath: CHROMIUM_PATH,
        headless: true
    });

    const page = await browser.newPage();
    const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(query)}&post_type=post`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".search-entry-title a");

    // Extract the first search result link
    const searchHtml = await page.content();
    const $ = cheerio.load(searchHtml);
    const firstResult = $(".search-entry-title a").first();
    const movieTitle = firstResult.text().trim();
    const movieLink = firstResult.attr("href");

    if (!movieLink) {
        await browser.close();
        return { error: "Movie not found" };
    }

    // Go to the movie page
    await page.goto(movieLink, { waitUntil: "domcontentloaded" });

    // Extract description
    await page.waitForSelector(".elementor-widget-text-editor p");
    const description = await page.evaluate(() => {
        return document.querySelector(".elementor-widget-text-editor p")?.innerText || "No description available";
    });

    // Get the intermediate download page
    await page.waitForSelector(".elementor-button-wrapper a");
    const downloadPageLink = await page.evaluate(() => {
        return document.querySelector(".elementor-button-wrapper a")?.href || "No download page found";
    });

    if (!downloadPageLink.startsWith("https://downloadwella.com")) {
        await browser.close();
        return { error: "Invalid download link" };
    }

    // Go to the download page
    await page.goto(downloadPageLink, { waitUntil: "domcontentloaded" });

    // Wait for the "Create Download Link" button to appear
    await page.waitForSelector(".btext", { timeout: 5000 });
    
    // Capture network requests to detect final download link
    let finalDownloadLink = null;
    page.on("request", (request) => {
        const url = request.url();
        if (url.includes("dweds11.downloadwella.com") && url.endsWith(".mkv")) {
            finalDownloadLink = url;
        }
    });

    // Click the "Create Download Link" button
    await page.click(".btext");
    
    // Wait for network requests to process
    await page.waitForTimeout(5000);

    await browser.close();

    return {
        title: movieTitle,
        description,
        final_download_link: finalDownloadLink || "Download link not found"
    };
};

// Route: GET /nkiri/movie?query=moana
router.get("/movie", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Movie query is required" });

        const movieData = await scrapeNkiri(query);
        res.json(movieData);
    } catch (error) {
        res.status(500).json({ error: "Something went wrong", details: error.message });
    }
});

module.exports = router;
