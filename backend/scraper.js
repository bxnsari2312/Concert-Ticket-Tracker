const puppeteer = require('puppeteer');

async function scrapeTicketmasterLowestPrice(url) {
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    try {
        // 1. Wait for ticket list to render (can be slow)
        await page.waitForSelector('ul[role="menu"] [data-price], [data-qa="ticket-list"] [data-price]', { timeout: 25000 });

        // 2. Scrape all visible [data-price] tickets
        const priceAndLinks = await page.$$eval('[data-price]', els =>
            els.map(el => {
                // Clean price and try to find link
                let price = el.getAttribute('data-price');
                // Try to find closest anchor up the tree, or use current element's parent
                let parent = el.closest('a');
                return {
                    price: price ? parseFloat(price.replace(/[^0-9.]/g, '')) : null,
                    link: parent ? parent.href : window.location.href,
                    section: el.innerText || '', // For debugging
                };
            }).filter(t => t.price !== null)
        );

        let lowest = null;
        if (priceAndLinks.length > 0) {
            lowest = priceAndLinks.reduce((a, b) => a.price < b.price ? a : b);
        }
        await browser.close();
        return lowest ? { price: lowest.price, link: lowest.link } : { price: null, link: url };
    } catch (err) {
        // Dump full page for debugging
        const fs = require('fs');
        fs.writeFileSync('debug.html', await page.content());
        console.error('[Scraper Error]: Could not find ticket prices. HTML dumped to debug.html');
        await browser.close();
        return { price: null, link: url };
    }
}

module.exports = { scrapeTicketmasterLowestPrice };

