const fs = require('fs');

async function testPages() {
  try {
    const homeRes = await fetch('http://localhost:3000');
    console.log('Homepage status:', homeRes.status);
    const homeHtml = await homeRes.text();
    console.log('Homepage has countdown-wrapper:', homeHtml.includes('countdown-wrapper'));

    const dealsRes = await fetch('http://localhost:3000/deals');
    console.log('Deals status:', dealsRes.status);
    const dealsHtml = await dealsRes.text();
    console.log('Deals has deal-countdown-box:', dealsHtml.includes('deal-countdown-box'));
  } catch (err) {
    console.log('Error testing pages:', err.message);
  }
}

testPages();
