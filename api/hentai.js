const express = require("express");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");

const router = express.Router();
const CHROMIUM_PATH = "/usr/bin/chromium";

// Function to scrape Nkiri and get the final download link
const scrapeNkiri = async (query) => {
    console.log(`Starting scrape for: ${query}`);
    const browser = await puppeteer.launch({
        executablePath: CHROMIUM_PATH,
        headless: true,
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--remote-debugging-port=9222"
        ]
    });

    const page = await browser.newPage();
    const searchUrl = `https://nkiri.com/?s=${encodeURIComponent(query)}&post_type=post`;

    try {
        console.log(`Navigating to: ${searchUrl}`);
        await page.goto(searchUrl, { waitUntil: "domcontentloaded" });
        await page.waitForSelector(".search-entry-title a", { timeout: 10000 });

        const searchHtml = await page.content();
        const $ = cheerio.load(searchHtml);
        const firstResult = $(".search-entry-title a").first();
        const movieTitle = firstResult.text().trim();
        const movieLink = firstResult.attr("href");

        if (!movieLink) {
            console.error("Movie link not found.");
            await browser.close();
            return { error: "Movie not found" };
        }

        console.log(`Movie found: ${movieTitle} | Link: ${movieLink}`);
        await page.goto(movieLink, { waitUntil: "domcontentloaded" });

        // Extract description
        await page.waitForSelector("div.elementor-element-cb5d89d p", { timeout: 10000 });
        const description = await page.evaluate(() => {
            return document.querySelector("div.elementor-element-cb5d89d p")?.innerText.trim() || "No description available";
        });

        console.log(`Description found: ${description}`);

        // Get the intermediate download page link
        await page.waitForSelector(".elementor-button-wrapper a", { timeout: 10000 });
        const downloadLink = await page.evaluate(() => {
            return document.querySelector(".elementor-button-wrapper a")?.href || "No download link found";
        });

        if (!downloadLink.startsWith("http")) {
            console.error("Invalid download link.");
            await browser.close();
            return { title: movieTitle, description, download_link: "Invalid download link" };
        }

        console.log(`Navigating to download page: ${downloadLink}`);
        await page.goto(downloadLink, { waitUntil: "domcontentloaded" });

        // Click the "Create Download Link" button
        await page.waitForSelector(".btext", { timeout: 10000 });
        await page.click(".btext");

        console.log("Clicked 'Create Download Link' button. Monitoring network requests...");

        // **Capture the final download link from network requests**
        let finalDownloadLink = null;
        page.on("response", async (response) => {
            const url = response.url();
            if (url.includes("downloadwella.com/d/") && url.endsWith(".mkv")) {
                finalDownloadLink = url;
                console.log(`Final download link detected: ${finalDownloadLink}`);
            }
        });

        // **Wait for the download request**
        await page.waitForTimeout(8000); // Allow time for request capture

        if (!finalDownloadLink) {
            console.error("Final download link not found.");
            await browser.close();
            return { title: movieTitle, description, download_link: "No final link found" };
        }

        console.log(`Final download link found: ${finalDownloadLink}`);
        await browser.close();

        return {
            title: movieTitle,
            description,
            download_link: finalDownloadLink
        };
    } catch (error) {
        console.error("Error during scraping:", error.message);
        await browser.close();
        return { error: "Something went wrong", details: error.message };
    }
};

// Route: GET /nkiri/movie?query=moana
router.get("/movie", async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) return res.status(400).json({ error: "Movie query is required" });

        const movieData = await scrapeNkiri(query);
        res.json(movieData);
    } catch (error) {
        console.error("Server error:", error.message);
        res.status(500).json({ error: "Something went wrong", details: error.message });
    }
});

module.exports = router;
