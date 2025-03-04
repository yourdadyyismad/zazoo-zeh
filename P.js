const puppeteer = require("puppeteer-core");

async function getGeniusSongUrl(query) {
    const browser = await puppeteer.launch({
        executablePath: "/usr/bin/chromium", // Ensure Chromium is installed here
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();
    const searchUrl = `https://genius.com/search?q=${encodeURIComponent(query)}`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded" });

    // Wait for song results to load
    await page.waitForSelector("a.mini_card", { timeout: 5000 }).catch(() => null);

    // Extract song link
    const songLink = await page.evaluate(() => {
        const songElement = document.querySelector("a.mini_card");
        return songElement ? songElement.href : null;
    });

    await browser.close();

    if (songLink) {
        console.log("🎵 Found song:", songLink);
        return songLink;
    } else {
        console.log("❌ No song found!");
        return null;
    }
}

// Test
getGeniusSongUrl("Not Like Us");
