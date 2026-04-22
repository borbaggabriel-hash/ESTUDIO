import fs from 'fs';

async function run() {
  try {
    const res = await fetch('https://reparav22-production.up.railway.app/assets/index-B80VBz11.js');
    const text = await res.text();
    fs.writeFileSync('bundle.js', text);
    console.log('Saved bundle.js');
  } catch (e) {
    console.error(e);
  }
}
run();
