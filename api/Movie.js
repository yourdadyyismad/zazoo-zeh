    const express = require("express");
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
    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

    // Step 3: Wait for the search results to load
    await page.waitForSelector(".gs-title a.gs-title");
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

    console.log(`🔗 First result URL: ${firstResultUrl}`);

    // Step 5: Navigate to the first result's page
    console.log(`🌍 Fetching song page: ${firstResultUrl}`);
    await page.goto(firstResultUrl, { waitUntil: "domcontentloaded" });

    // Step 6: Wait for the song details and lyrics to load
    await page.waitForSelector(".cnt-head_title");
    console.log("✅ Song page loaded.");

    // Step 7: Extract song details and lyrics
    const songDetails = await page.evaluate(() => {
      
      const lyrics = document.querySelector(".cnt-letra")?.innerText.trim();

      return {
        lyrics,
      };
    });

    

  
    console.log(`📜 Lyrics: ${songDetails.lyrics.substring(0, 50)}...`); // Log first 50 chars of lyrics

    // Step 8: Close the browser
    await browser.close();

    // Step 9: Return the response
    return res.json({
      CREATOR: "DRACULA",
      STATUS: 200,
      query,
      songDetails,
    });
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
