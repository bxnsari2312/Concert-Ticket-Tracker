const { scrapeTicketmasterLowestPrice } = require('./scraper');

(async () => {
  const url = 'https://www.ticketmaster.ca/shawn-mendes-on-the-road-again-toronto-ontario-09-28-2025/event/100062BBEB654088';
  const price = await scrapeTicketmasterLowestPrice(url);
  console.log('Scraped price:', price);
})();

