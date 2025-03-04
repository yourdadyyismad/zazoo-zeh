const express = require("express");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");

const router = express.Router();
const CHROMIUM_PATH = "/usr/bin/chromium"; // Change if needed

const scrapeNkiri = async (query) => {
    const browser = await puppeteer.launch({
        executablePath: CHROMIUM_PATH,
        headless: true
    });

    const page = await browser.newPage();
    const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(query)}&post_type=post`;

    console.log(`Searching for: ${query}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

    await page.waitForSelector(".search-entry-title a");
    const searchHtml = await page.content();
    const $ = cheerio.load(searchHtml);

    const firstResult = $(".search-entry-title a").first();
    const movieTitle = firstResult.text().trim();
    const movieLink = firstResult.attr("href");

    if (!movieLink) {
        await browser.close();
        return { error: "Movie not found" };
    }

    console.log(`Found: ${movieTitle} | Link: ${movieLink}`);

    // Go to the movie details page
    await page.goto(movieLink, { waitUntil: "domcontentloaded" });

    // Extract movie description
    await page.waitForSelector(".elementor-widget-text-editor p");
    const description = await page.evaluate(() => {
        return document.querySelector(".elementor-widget-text-editor p")?.innerText || "No description available";
    });

    console.log(`Description: ${description}`);

    // Get download link
    await page.waitForSelector(".elementor-button-wrapper a");
    const downloadPageLink = await page.evaluate(() => {
        return document.querySelector(".elementor-button-wrapper a")?.href || "";
    });

    if (!downloadPageLink) {
        await browser.close();
        return { error: "Download page not found" };
    }

    console.log(`Navigating to download page: ${downloadPageLink}`);

    // Extract file code from URL
    const fileCodeMatch = downloadPageLink.match(/https:\/\/downloadwella\.com\/([^/]+)\//);
    const fileCode = fileCodeMatch ? fileCodeMatch[1] : null;

    if (!fileCode) {
        await browser.close();
        return { error: "File code extraction failed" };
    }

    console.log(`Extracted file code: ${fileCode}`);

    // Construct final direct download link
    const finalDownloadLink = `https://downloadwella.com/cgi-bin/tracker.cgi?file_code=${fileCode}`;
    console.log(`Final Download Link: ${finalDownloadLink}`);

    await browser.close();

    return {
        title: movieTitle,
        description,
        download_page: downloadPageLink,
        final_download_link: finalDownloadLink
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
        console.error("Scraping error:", error);
        res.status(500).json({ error: "Something went wrong", details: error.message });
    }
});

module.exports = router;
