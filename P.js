const puppeteer = require('puppeteer-core');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium', // Make sure this points to the installed Chromium
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://example.com');
    console.log(await page.title());
    await browser.close();
})();
