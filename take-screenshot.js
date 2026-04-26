const puppeteer = require('puppeteer');
const path = require('path');

async function takeScreenshot() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Take screenshot of Frontend
  await page.goto('http://localhost:13100', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(__dirname, 'inventory-frontend.png') });
  
  // Take screenshot of Backend API docs
  await page.goto('http://localhost:13101/api/docs', { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.join(__dirname, 'inventory-backend-api.png') });
  
  await browser.close();
  
  console.log('Screenshots saved!');
}

takeScreenshot();
