const { chromium } = require('playwright');

async function takeScreenshots() {
  console.log('Starting browser...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox']
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    // Screenshot 1: Inventory Frontend
    console.log('Capturing Inventory Frontend...');
    await page.goto('http://localhost:13100', { waitUntil: 'networkidle' });
    await page.screenshot({ 
      path: '/Users/happytech/Showcase/happy-pos/inventory-frontend.png',
      fullPage: true 
    });
    console.log('✅ Frontend screenshot saved');
    
    // Screenshot 2: Backend API Docs
    console.log('Capturing Backend API Docs...');
    await page.goto('http://localhost:13101/api/docs', { waitUntil: 'networkidle' });
    await page.screenshot({ 
      path: '/Users/happytech/Showcase/happy-pos/inventory-backend-api.png',
      fullPage: true 
    });
    console.log('✅ Backend API screenshot saved');
    
    // Screenshot 3: Happy POS (if running)
    try {
      console.log('Capturing Happy POS...');
      await page.goto('http://localhost:21300', { waitUntil: 'networkidle', timeout: 5000 });
      await page.screenshot({ 
        path: '/Users/happytech/Showcase/happy-pos/happy-pos.png',
        fullPage: true 
      });
      console.log('✅ Happy POS screenshot saved');
    } catch (e) {
      console.log('⚠️ Happy POS not running, skipping...');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
    console.log('Browser closed');
  }
}

takeScreenshots();
