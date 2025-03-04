const express = require("express");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");

const router = express.Router();

// Chromium executable path
const CHROMIUM_PATH = "/usr/bin/chromium";

// Function to scrape Nkiri
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

    // Extract description (More specific)
    await page.waitForSelector("div.elementor-element-cb5d89d p");
    const description = await page.evaluate(() => {
        return document.querySelector("div.elementor-element-cb5d89d p")?.innerText.trim() || "No description available";
    });

    // Get the download link
    await page.waitForSelector(".elementor-button-wrapper a");
    const downloadLink = await page.evaluate(() => {
        return document.querySelector(".elementor-button-wrapper a")?.href || "No download link found";
    });

    await browser.close();

    return {
        title: movieTitle,
        description,
        download_link: downloadLink
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
