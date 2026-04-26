const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Frontend
  console.log('Taking screenshot of Frontend at http://localhost:13100...');
  await page.goto('http://localhost:13100', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'inventory-frontend.png', fullPage: false });
  console.log('Saved: inventory-frontend.png');
  
  // Backend API docs
  console.log('Taking screenshot of Backend API at http://localhost:13101/api/docs...');
  await page.goto('http://localhost:13101/api/docs', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: 'inventory-backend-api.png', fullPage: false });
  console.log('Saved: inventory-backend-api.png');
  
  await browser.close();
  console.log('Done!');
})();
