const express = require("express");
const puppeteer = require("puppeteer-core");
const cheerio = require("cheerio");

const router = express.Router();

// Chromium executable path
const CHROMIUM_PATH = "/usr/bin/chromium";

// Function to scrape Nkiri and get the final movie link
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
    await page.waitForSelector("div.elementor-element-cb5d89d p");
    const description = await page.evaluate(() => {
        return document.querySelector("div.elementor-element-cb5d89d p")?.innerText.trim() || "No description available";
    });

    // Get the intermediate download page link
    await page.waitForSelector(".elementor-button-wrapper a");
    const downloadLink = await page.evaluate(() => {
        return document.querySelector(".elementor-button-wrapper a")?.href || "No download link found";
    });

    if (!downloadLink.startsWith("http")) {
        await browser.close();
        return { title: movieTitle, description, download_link: "Invalid download link" };
    }

    // Go to the intermediate download page
    await page.goto(downloadLink, { waitUntil: "domcontentloaded" });

    // Click the "Create Download Link" button
    await page.waitForSelector(".btext");
    await page.click(".btext");

    // **Wait for the final download link using a Promise**
    const finalDownloadLink = await new Promise(async (resolve, reject) => {
        try {
            let tries = 0;
            let maxTries = 10; // Try up to 10 times

            while (tries < maxTries) {
                await page.waitForTimeout(2000); // Wait 2 seconds before checking

                // Look for a link that starts with `https://dweds11.downloadwella`
                const foundLink = await page.evaluate(() => {
                    const anchor = [...document.querySelectorAll("a")].find(a =>
                        a.href.includes("downloadwella") && a.href.endsWith(".mkv")
                    );
                    return anchor ? anchor.href : null;
                });

                if (foundLink) {
                    resolve(foundLink);
                    return;
                }

                tries++;
            }

            reject("Final download link not found");
        } catch (error) {
            reject(error);
        }
    });

    await browser.close();

    return {
        title: movieTitle,
        description,
        download_link: finalDownloadLink
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
