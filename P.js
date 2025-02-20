const puppeteer = require('puppeteer-core');

(async () => {
    const browser = await puppeteer.launch({
        headless: true,
        executablePath: '/usr/bin/chromium', // Make sure this points to the installed Chromium
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://sfmcompile.club/?redirect_to=random');

    try {
const title = await page.$eval('.g1-mega.g1-mega-1st.entry-title', el => el.innerText);
console.log("Title:", title);
    } catch(error) {
        console.log("chai")
    }

    const publish = await page.$eval('.entry-date', el => el.innerText);
    console.log("released:", publish);

    
    try {
    const videoSrc = await page.$eval('figure.wp-block-video video', el => el.getAttribute('src'));
    console.log("Video Source:", videoSrc);
} catch (error) {
    console.log("Video not found:", error);
}
    
    
    await browser.close();
})();
