const express = require("express");
const puppeteer = require("puppeteer-core");

const router = express.Router();

// Nkiri Movie Search & Download Scraper
router.get("/nkiri", async (req, res) => {
    try {
        const { movie } = req.query;
        if (!movie) return res.status(400).json({ error: "Please provide a movie name" });

        const browser = await puppeteer.launch({
            headless: true,
            executablePath: "/usr/bin/chromium", // Custom Chromium Path
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.goto(`https://nkiri.com/?s=${encodeURIComponent(movie)}`, { waitUntil: "domcontentloaded" });

        // Extract movie links from search results
        const movies = await page.evaluate(() => {
            return Array.from(document.querySelectorAll(".post-title a")).map(link => ({
                title: link.innerText.trim(),
                url: link.href
            }));
        });

        if (movies.length === 0) {
            await browser.close();
            return res.status(404).json({ error: "No movies found" });
        }

        // Open first movie result (you can modify this to let users choose)
        await page.goto(movies[0].url, { waitUntil: "domcontentloaded" });

        // Extract Download Links
        const downloadLinks = await page.evaluate(() => {
            return Array.from(document.querySelectorAll("a[href*='download']"))
                .map(link => ({
                    quality: link.innerText.trim(),
                    url: link.href
                }));
        });

        await browser.close();

        res.json({
            movie: movies[0].title,
            pageUrl: movies[0].url,
            downloadLinks: downloadLinks.length ? downloadLinks : "No download links found"
        });

    } catch (error) {
        res.status(500).json({ error: "Something went wrong", details: error.message });
    }
});

module.exports = router;
