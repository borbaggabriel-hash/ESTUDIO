import fs from 'fs';

async function run() {
  const res = await fetch('https://reparav22-production.up.railway.app/assets/index-DM037WsW.css');
  const css = await res.text();
  const rootVars = css.match(/:root\s*{([^}]+)}/);
  if (rootVars) {
    console.log(rootVars[1].split(';').map(s => s.trim()).filter(Boolean).join('\n'));
  }
}
run();
