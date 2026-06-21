const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Go to Login page first
  console.log('Navigating to /login...');
  await page.goto('http://localhost:8086/login', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'login_initial.png' });
  
  // Try to type in email and password
  console.log('Typing credentials...');
  await page.type('#email', 'test123456@example.com');
  await page.type('#password', 'password123');
  await page.screenshot({ path: 'login_filled.png' });
  
  // Click sign in
  console.log('Clicking sign in...');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'login_submitted.png' });
  
  // Now try signup
  console.log('Navigating to /signup...');
  await page.goto('http://localhost:8086/signup', { waitUntil: 'networkidle2' });
  await page.screenshot({ path: 'signup_initial.png' });
  
  console.log('Typing signup credentials...');
  await page.type('#fullName', 'Test User');
  await page.type('#email', 'test1234567@example.com');
  await page.type('#password', 'password123');
  
  console.log('Clicking recaptcha...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[type="button"]'));
    const recaptcha = buttons.find(b => b.textContent.includes('not a robot') || b.className.includes('border-slate-300'));
    if(recaptcha) recaptcha.click();
  });
  
  await new Promise(r => setTimeout(r, 1500));
  
  console.log('Clicking signup submit...');
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'signup_submitted.png' });
  
  await browser.close();
  console.log('Done.');
})();
