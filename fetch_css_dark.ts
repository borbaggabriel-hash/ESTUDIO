import fs from 'fs';

async function run() {
  const res = await fetch('https://reparav22-production.up.railway.app/assets/index-DM037WsW.css');
  const css = await res.text();
  const darkVars = css.match(/\.dark\s*{([^}]+)}/);
  if (darkVars) {
    console.log(darkVars[1].split(';').map(s => s.trim()).filter(Boolean).join('\n'));
  }
}
run();
