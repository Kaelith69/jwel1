// Quick smoke test for the site
// Run with: node test-smoke.js

const http = require('http');

const tests = [
  { name: 'Home page', url: 'http://localhost:8000/' },
  { name: 'Products page', url: 'http://localhost:8000/products.html' },
  { name: 'Checkout page', url: 'http://localhost:8000/checkout.html' },
  { name: 'Contact page', url: 'http://localhost:8000/contact.html' },
  { name: 'Admin login', url: 'http://localhost:8000/admin/index.html' },
  { name: 'Admin products', url: 'http://localhost:8000/admin/products.html' },
  { name: 'Admin orders', url: 'http://localhost:8000/admin/orders.html' },
  { name: 'Admin dashboard', url: 'http://localhost:8000/admin/dashboard.html' },
  { name: 'Add product', url: 'http://localhost:8000/admin/add-product.html' },
  { name: 'Settings', url: 'http://localhost:8000/admin/settings.html' },
  { name: 'Logo image', url: 'http://localhost:8000/logo/logo.png' },
  { name: 'Product image 1', url: 'http://localhost:8000/assets/IMG-20250812-WA0001.jpg' },
  { name: 'Utils.js', url: 'http://localhost:8000/js/utils.js' },
  { name: 'Main.js', url: 'http://localhost:8000/main.js' },
  { name: 'Admin.js', url: 'http://localhost:8000/admin/admin.js' },
];

let passed = 0;
let failed = 0;

function testUrl(test) {
  return new Promise((resolve) => {
    const req = http.get(test.url, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${test.name.padEnd(20)} - ${res.statusCode}`);
        passed++;
      } else {
        console.log(`❌ ${test.name.padEnd(20)} - ${res.statusCode}`);
        failed++;
      }
      resolve();
    });
    
    req.on('error', (err) => {
      console.log(`❌ ${test.name.padEnd(20)} - ${err.message}`);
      failed++;
      resolve();
    });
    
    req.setTimeout(5000, () => {
      console.log(`⏱️  ${test.name.padEnd(20)} - Timeout`);
      failed++;
      req.destroy();
      resolve();
    });
  });
}

async function runTests() {
  console.log('\n🧪 Running smoke tests...\n');
  
  for (const test of tests) {
    await testUrl(test);
  }
  
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('✨ All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed\n');
    process.exit(1);
  }
}

runTests();
