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

    // Step 2: Navigate to the search page with a timeout
    const searchUrl = `${BASE_URL}/?q=${encodeURIComponent(query)}`;
    console.log(`🌍 Fetching search page: ${searchUrl}`);
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 30000 }); // 30 seconds timeout

    // Step 3: Extract the first result's URL
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

    // Step 4: Navigate to the first result's page with a timeout
    console.log(`🌍 Fetching song page: ${firstResultUrl}`);
    await page.goto(firstResultUrl, { waitUntil: "domcontentloaded", timeout: 30000 }); // 30 seconds timeout

    // Step 5: Extract song details and lyrics
    const songDetails = await page.evaluate(() => {
      const songTitle = document.querySelector(".textStyle--type-title h1.textStyle-primary")?.innerText.trim();
      const artistName = document.querySelector(".textStyle--type-title h2.textStyle-secondary")?.innerText.trim();
      const lyrics = document.querySelector(".lyric-content")?.innerText.trim();

      return {
        songTitle,
        artistName,
        lyrics,
      };
    });

    if (!songDetails.songTitle || !songDetails.artistName || !songDetails.lyrics) {
      console.log("❌ Song details or lyrics not found.");
      await browser.close();
      return res.status(404).json({ error: "Song details or lyrics not found" });
    }

    console.log(`🎵 Song Title: ${songDetails.songTitle}`);
    console.log(`🎤 Artist: ${songDetails.artistName}`);
    console.log(`📜 Lyrics: ${songDetails.lyrics.substring(0, 50)}...`); // Log first 50 chars of lyrics

    // Step 6: Close the browser
    await browser.close();

    // Step 7: Return the response
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
