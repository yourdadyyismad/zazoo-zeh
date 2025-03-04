const express = require("express");
const puppeteer = require("puppeteer-core");

const app = express();
const port = 7860; // Change if needed

app.get("/search", async (req, res) => {
    const { query } = req.query;
    if (!query) {
        return res.status(400).json({ error: "Missing 'query' parameter" });
    }

    try {
        const browser = await puppeteer.launch({
            executablePath: "/usr/bin/chromium",
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        const searchUrl = `https://genius.com/search?q=${encodeURIComponent(query)}`;
        
        await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

        // Wait for the first search result
        await page.waitForSelector("a.mini_card", { timeout: 5000 }).catch(() => null);

        // Get the first song link
        const songLink = await page.evaluate(() => {
            const songElement = document.querySelector("a.mini_card");
            return songElement ? songElement.href : null;
        });

        await browser.close();

        if (songLink) {
            res.json({ success: true, song_url: songLink });
        } else {
            res.json({ success: false, message: "No song found" });
        }

    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
});

app.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
});
