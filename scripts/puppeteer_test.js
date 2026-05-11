import puppeteer from 'puppeteer';

(async () => {
    let browser;
    try {
        browser = await puppeteer.launch({ 
            headless: 'new',
            args: ['--no-sandbox']
        });
        const page = await browser.newPage();
        
        page.on('console', msg => console.log('PAGE LOG:', msg.text()));
        page.on('pageerror', err => console.log('PAGE ERROR:', err.toString()));
        
        await page.goto('file:///home/spectre05/Masaüstü/LifeCoach-Cloude/public/life-coach-ui.html', {waitUntil: 'networkidle0', timeout: 10000});
        
        const splashOpacity = await page.$eval('#splash-screen', el => window.getComputedStyle(el).opacity);
        const splashDisplay = await page.$eval('#splash-screen', el => window.getComputedStyle(el).display);
        console.log('SPLASH OPACITY:', splashOpacity, 'DISPLAY:', splashDisplay);
    } catch(e) {
        console.error('Script Error:', e.message);
    } finally {
        if(browser) await browser.close();
    }
})();
