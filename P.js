const puppeteer = require('puppeteer-core');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium', // Make sure this points to the installed Chromium
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://github.com/suhail');

    try {
const title = await page.$eval('.p-name.vcard-fullname.d-block.overflow-hidden', el => el.innerText);
console.log("Title:", title);
    } catch(error) {
        console.log("chai")
    }
    
    await browser.close();
})();
