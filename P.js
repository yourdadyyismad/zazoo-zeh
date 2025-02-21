const puppeteer = require('puppeteer-core');

(async () => {
    const URL = 'https://www.xvideos.com/video.otmpkih88ac/sweet_horny_asaba_runs_babe_fucks_for_free_house_rent';
    
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium', // Make sure this points to the installed Chromium
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded' });

    
    await page.waitForSelector('#main');
    console.log('Page Opened Successfully ✅');

    const title = await page.$eval('h2.page-title', el => el.innerText);
console.log("Title:", title);


    const thumbnail = await page.$eval('img.src', el => el.innerText);
    console.log("Image:", thumbnail);

    try {
    const videoSrc = await page.$eval('video > source', el => el.getAttribute('src'));
    console.log("Video Source:", videoSrc);
} catch (error) {
    console.log("Video source not found:", error);
    }
    
    await browser.close();
})();
