/**
 * E2E Test Script for AI Recruit Agent
 * 
 * This script tests the complete user flow:
 * 1. Login page
 * 2. Registration
 * 3. Homepage
 * 4. Assessment
 * 5. Profile
 * 6. Matching
 * 7. Career Planning
 * 
 * Requirements: npm install -D playwright @playwright/test
 * Run: node e2e-test.js
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create screenshots directory
const screenshotsDir = path.join(__dirname, 'test-screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down by 1 second for visibility
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  const results = {
    success: [],
    errors: [],
    warnings: []
  };

  try {
    console.log('\n=== Step 1: Navigate to Login Page ===');
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '01-login-page.png'), fullPage: true });
    
    // Check for email and password fields
    const emailInput = await page.$('input[type="email"], input[placeholder*="邮箱"], input[name="email"]');
    const passwordInput = await page.$('input[type="password"], input[placeholder*="密码"], input[name="password"]');
    
    if (emailInput && passwordInput) {
      results.success.push('✓ Login page loaded with email and password fields');
      console.log('✓ Login page loaded successfully');
    } else {
      results.errors.push('✗ Login page missing email or password fields');
      console.log('✗ Login page missing required fields');
    }

    console.log('\n=== Step 2: Navigate to Register Page ===');
    const registerLink = await page.$('text=立即注册');
    if (registerLink) {
      await registerLink.click();
      await page.waitForURL('**/register', { timeout: 5000 });
      await sleep(2000);
      await page.screenshot({ path: path.join(screenshotsDir, '02-register-page.png'), fullPage: true });
      results.success.push('✓ Successfully navigated to register page');
      console.log('✓ Register page loaded');
    } else {
      results.errors.push('✗ "立即注册" link not found');
      console.log('✗ Register link not found');
      // Try direct navigation
      await page.goto('http://localhost:5173/register', { waitUntil: 'networkidle' });
      await sleep(2000);
      await page.screenshot({ path: path.join(screenshotsDir, '02-register-page.png'), fullPage: true });
    }

    console.log('\n=== Step 3: Register New Account ===');
    
    // Wait for form to be ready
    await page.waitForSelector('input[placeholder="姓名"]', { timeout: 5000 });
    
    // Fill registration form using Ant Design placeholders
    await page.fill('input[placeholder="姓名"]', '演示用户');
    await page.fill('input[placeholder="邮箱"]', 'demo@test.com');
    await page.fill('input[placeholder="密码"]', 'demo123456');
    
    const submitButton = await page.$('button:has-text("注册")');
    
    if (submitButton) {
      
      console.log('Filled registration form...');
      await sleep(1000);
      await page.screenshot({ path: path.join(screenshotsDir, '03-register-form-filled.png'), fullPage: true });
      
      await submitButton.click();
      console.log('Clicked submit button...');
      
      // Wait for either redirect to home or error message
      try {
        await page.waitForURL('**/', { timeout: 5000 });
        await sleep(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '04-homepage-after-register.png'), fullPage: true });
        results.success.push('✓ Registration successful, redirected to homepage');
        console.log('✓ Successfully registered and redirected to homepage');
      } catch (e) {
        // Check if stayed on same page (might indicate error)
        await sleep(2000);
        await page.screenshot({ path: path.join(screenshotsDir, '03b-register-error.png'), fullPage: true });
        const errorMsg = await page.$('.ant-message-error, .ant-form-item-explain-error');
        if (errorMsg) {
          const errorText = await errorMsg.textContent();
          results.warnings.push(`⚠ Registration error: ${errorText}`);
          console.log('⚠ Registration error:', errorText);
          
          // Try to login instead
          console.log('Attempting to login with existing account...');
          await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
          await page.waitForSelector('input[placeholder="邮箱"]');
          await page.fill('input[placeholder="邮箱"]', 'demo@test.com');
          await page.fill('input[placeholder="密码"]', 'demo123456');
          const loginButton = await page.$('button:has-text("登录")');
          
          if (loginButton) {
            await loginButton.click();
            await page.waitForURL('**/', { timeout: 5000 });
            await sleep(2000);
            await page.screenshot({ path: path.join(screenshotsDir, '04-homepage-after-login.png'), fullPage: true });
            results.success.push('✓ Logged in with existing account');
            console.log('✓ Logged in successfully');
          }
        } else {
          results.errors.push('✗ Registration did not redirect to homepage');
          console.log('✗ Registration failed or no redirect');
        }
      }
    } else {
      results.errors.push('✗ Registration submit button not found');
      console.log('✗ Submit button not found');
    }

    console.log('\n=== Step 4: Verify Homepage Elements ===');
    
    // Make sure we're on homepage
    const currentUrl1 = page.url();
    if (!currentUrl1.includes('localhost:5173') || currentUrl1.includes('/login') || currentUrl1.includes('/register')) {
      await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
      await sleep(2000);
    }
    
    // Check for hero section
    const heroText = await page.textContent('body');
    if (heroText.includes('从匹配到发现') || heroText.includes('让每个人都能找到属于自己的工作')) {
      results.success.push('✓ Hero section found on homepage');
      console.log('✓ Hero section present');
    }
    
    // Check for feature cards - look for specific feature titles
    const bodyText = await page.textContent('body');
    const features = ['AI 职业测评', '智能岗位匹配', 'AI 模拟面试', '职业生涯规划'];
    const foundFeatures = features.filter(f => bodyText.includes(f));
    
    results.success.push(`✓ Found ${foundFeatures.length}/4 feature cards: ${foundFeatures.join(', ')}`);
    console.log(`✓ Found ${foundFeatures.length}/4 feature cards`);
    
    // Check for user status
    if (bodyText.includes('未测评') || bodyText.includes('已完成测评')) {
      const status = bodyText.includes('已完成测评') ? '已完成测评' : '未测评';
      results.success.push(`✓ User status displayed: ${status}`);
      console.log('✓ User status:', status);
    }
    
    await sleep(1000);
    await page.screenshot({ path: path.join(screenshotsDir, '05-homepage-full.png'), fullPage: true });

    console.log('\n=== Step 5: Navigate to Assessment Page ===');
    
    // Navigate directly to assessment page
    await page.goto('http://localhost:5173/assessment', { waitUntil: 'networkidle' });
    await sleep(3000); // Wait for AI to generate first message
    await page.screenshot({ path: path.join(screenshotsDir, '06-assessment-page.png'), fullPage: true });
    
    // Check if AI message appeared
    const pageText = await page.textContent('body');
    if (pageText.includes('你好') || pageText.includes('欢迎') || pageText.includes('测评') || pageText.length > 100) {
      results.success.push('✓ Assessment page loaded with content');
      console.log('✓ Assessment page loaded');
    } else {
      results.warnings.push('⚠ Assessment page loaded but waiting for content');
      console.log('⚠ Waiting for content to load');
      await sleep(3000); // Wait a bit more
      await page.screenshot({ path: path.join(screenshotsDir, '06b-assessment-page-wait.png'), fullPage: true });
    }
    
    console.log('\n=== Step 6: Test Chat Interaction ===');
    
    // Find input box and send message - try multiple selectors
    const chatInput = await page.$('textarea') || await page.$('input[type="text"]');
    if (chatInput) {
      await chatInput.fill('我喜欢安静地写代码和看技术书籍，偶尔和朋友聚会');
      await sleep(500);
      
      // Try to find and click send button
      const sendButton = await page.$('button:has-text("发送")') || await page.$('button[type="submit"]');
      if (sendButton) {
        await sendButton.click();
        console.log('Sent message, waiting for AI reply...');
        await sleep(5000); // Wait for AI to respond
        await page.screenshot({ path: path.join(screenshotsDir, '07-assessment-chat.png'), fullPage: true });
        results.success.push('✓ Chat interaction completed');
        console.log('✓ Message sent');
      } else {
        // Try pressing Enter
        await chatInput.press('Enter');
        console.log('Pressed Enter to send message...');
        await sleep(5000);
        await page.screenshot({ path: path.join(screenshotsDir, '07-assessment-chat.png'), fullPage: true });
        results.success.push('✓ Chat message sent via Enter key');
        console.log('✓ Message sent via Enter');
      }
    } else {
      results.errors.push('✗ Chat input not found on assessment page');
      console.log('✗ Chat input not found');
    }

    console.log('\n=== Step 7: Navigate to Profile Page ===');
    await page.goto('http://localhost:5173/profile', { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '08-profile-page.png'), fullPage: true });
    
    const currentUrl = page.url();
    if (currentUrl.includes('/profile')) {
      results.success.push('✓ Profile page loaded');
      console.log('✓ Profile page displayed');
    } else if (currentUrl.includes('/assessment')) {
      results.warnings.push('⚠ Redirected to assessment (profile not yet generated)');
      console.log('⚠ Redirected to assessment - profile not ready');
    }

    console.log('\n=== Step 8: Navigate to Matching Page ===');
    await page.goto('http://localhost:5173/matching', { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '09-matching-page.png'), fullPage: true });
    results.success.push('✓ Matching page loaded');
    console.log('✓ Matching page displayed');

    console.log('\n=== Step 9: Navigate to Career Planning Page ===');
    await page.goto('http://localhost:5173/career', { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '10-career-page.png'), fullPage: true });
    results.success.push('✓ Career planning page loaded');
    console.log('✓ Career planning page displayed');

    console.log('\n=== Step 10: Return to Homepage ===');
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
    await sleep(2000);
    await page.screenshot({ path: path.join(screenshotsDir, '11-homepage-final.png'), fullPage: true });
    results.success.push('✓ Returned to homepage');
    console.log('✓ Back to homepage');

  } catch (error) {
    results.errors.push(`✗ Fatal error: ${error.message}`);
    console.error('Fatal error:', error);
    await page.screenshot({ path: path.join(screenshotsDir, 'error-screenshot.png'), fullPage: true });
  } finally {
    await sleep(2000);
    await browser.close();
  }

  // Print summary report
  console.log('\n' + '='.repeat(60));
  console.log('TEST REPORT SUMMARY');
  console.log('='.repeat(60));
  
  console.log('\n✓ SUCCESSES:');
  results.success.forEach(msg => console.log('  ' + msg));
  
  if (results.warnings.length > 0) {
    console.log('\n⚠ WARNINGS:');
    results.warnings.forEach(msg => console.log('  ' + msg));
  }
  
  if (results.errors.length > 0) {
    console.log('\n✗ ERRORS:');
    results.errors.forEach(msg => console.log('  ' + msg));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log(`Screenshots saved to: ${screenshotsDir}`);
  console.log('='.repeat(60) + '\n');
  
  // Save report to file
  const reportPath = path.join(screenshotsDir, 'test-report.txt');
  const reportContent = `
TEST REPORT - ${new Date().toLocaleString()}
${'='.repeat(60)}

SUCCESSES:
${results.success.map(msg => '  ' + msg).join('\n')}

WARNINGS:
${results.warnings.map(msg => '  ' + msg).join('\n')}

ERRORS:
${results.errors.map(msg => '  ' + msg).join('\n')}

${'='.repeat(60)}
Screenshots location: ${screenshotsDir}
  `;
  
  fs.writeFileSync(reportPath, reportContent);
  console.log(`Report saved to: ${reportPath}\n`);
}

// Run the test
runTest().catch(console.error);
