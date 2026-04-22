import fs from 'fs';

async function run() {
  try {
    const res = await fetch('https://reparav22-production.up.railway.app/assets/index-B80VBz11.js');
    const text = await res.text();
    // Extract strings that look like UI text (more than 5 chars, spaces, etc)
    const strings = text.match(/"([^"\\]*(\\.[^"\\]*)*)"/g) || [];
    const validStrings = strings
      .map(s => s.slice(1, -1))
      .filter(s => s.length > 5 && s.includes(' '));
    
    fs.writeFileSync('strings.txt', validStrings.join('\n'));
    console.log('Extracted ' + validStrings.length + ' strings');
  } catch (e) {
    console.error(e);
  }
}
run();
