const express = require("express");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer-core");

const router = express.Router();
const BASE_URL = "https://www.letras.com";

// **MAIN ROUTE**
router.get("/", async (req, res) => {
  const query = req.query.q;

  if (!query) return res.status(400).json({ error: "Missing 'q' parameter" });

  console.log(`🔍 Searching for: ${query}`);

  try {
    // Step 1: Launch Puppeteer browser
    const browser = await puppeteer.launch({
      headless: true,
      executablePath: "/usr/bin/chromium", // Adjust this path if needed
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();

    // Step 2: Navigate to the search page
    const searchUrl = `${BASE_URL}/?q=${encodeURIComponent(query)}`;
    console.log(`🌍 Fetching search page: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 }); // 30 seconds timeout

    // Step 3: Wait for the search results to load
    await page.waitForSelector(".gs-title a.gs-title", { timeout: 30000 }); // 30 seconds timeout
    console.log("✅ Search results loaded.");

    // Step 4: Extract the first result's URL
    const firstResultUrl = await page.evaluate(() => {
      const firstResult = document.querySelector(".gs-title a.gs-title");
      return firstResult ? firstResult.href : null;
    });

    if (!firstResultUrl) {
      console.log("❌ No search results found.");
      await browser.close();
      return res.status(404).json({ error: "No search results found" });
    }

    // Step 5: Construct the second URL
    const secondUrl = firstResultUrl.startsWith("http") ? firstResultUrl : `${BASE_URL}${firstResultUrl}`;
    console.log(`🔗 Second URL: ${secondUrl}`);

    // Step 6: Navigate to the second URL
    console.log(`🌍 Fetching song page: ${secondUrl}`);
    await page.goto(secondUrl, { waitUntil: "domcontentloaded", timeout: 30000 }); // 30 seconds timeout

    // Step 7: Wait for the lyrics to load
    await page.waitForSelector(".lyric-content", { timeout: 30000 }); // 30 seconds timeout
    console.log("✅ Song page loaded.");

    // Step 8: Extract the lyrics
    const lyrics = await page.evaluate(() => {
      const lyricContent = document.querySelector(".lyric-content");
      return lyricContent ? lyricContent.innerText.trim() : null;
    });

    if (!lyrics) {
      console.log("❌ Lyrics not found.");
      await browser.close();
      return res.status(404).json({ error: "Lyrics not found" });
    }

    console.log("📜 Lyrics found:");
    console.log(lyrics.substring(0, 100) + "..."); // Log first 100 characters of lyrics

    // Step 9: Close the browser
    await browser.close();

    // Step 10: Return the response
    return res.json({
      CREATOR: "DRACULA",
      STATUS: 200,
      query,
      secondUrl,
      lyrics,
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
