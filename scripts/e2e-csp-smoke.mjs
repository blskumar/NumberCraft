// CSP/theme/tab/account-modal smoke. Usage: node e2e-csp-smoke.mjs [baseUrl] (app already running; needs @playwright/test)
import { chromium } from '@playwright/test';
const base = process.argv[2] || 'http://localhost:3106';
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => {
  try { localStorage.setItem('numbercraft_theme_v1', 'dark'); } catch {}
  window.__csp = [];
  document.addEventListener('DOMContentLoaded', () => { window.__theme0 = document.documentElement.dataset.theme; });
  document.addEventListener('securitypolicyviolation', (e) =>
    window.__csp.push(`${e.violatedDirective} ${e.blockedURI} ${(e.sample || '').slice(0, 60)}`));
});
const p = await ctx.newPage();
p.setDefaultTimeout(5000);
const problems = [];
p.on('console', (m) => { if (['error', 'warning'].includes(m.type())) problems.push(`${m.type()}: ${m.text()}`); });
p.on('pageerror', (e) => problems.push('pageerror: ' + e.message));
await p.goto(base + '/');
await p.waitForSelector('[data-testid="studio-active-region"][aria-busy="false"]');
const theme = await p.evaluate(() => window.__theme0); // pre-hydration: proves the nonced inline theme script ran under CSP
const dismissEos = async () => {
  const m = p.getByTestId('end-of-session-modal');
  if (await m.count()) { await p.keyboard.press('Escape'); await p.waitForTimeout(200);
    if (await m.count()) await m.getByRole('button').last().click().catch(() => {}); }
};
const nav = p.getByRole('navigation', { name: 'Primary navigation' });
const tabs = (await nav.getByRole('button').allInnerTexts()).filter((t) => t.trim());
for (const t of tabs) { await dismissEos(); await nav.getByRole('button', { name: t.trim(), exact: true }).click().catch((e) => console.log('click-fail', String(e.message).split(String.fromCharCode(10)).slice(0,3).join(' | '))); await p.waitForTimeout(500); }
await dismissEos();
await p.getByRole('button', { name: /Open student profile/ }).first().click().catch((e) => console.log('click-fail', String(e.message).split(String.fromCharCode(10)).slice(0,3).join(' | ')));
await p.waitForTimeout(800);
const modal = await p.getByTestId('account-modal').count();
const viol = await p.evaluate(() => window.__csp);
// nonce on scripts?
const scripts = await p.evaluate(() => [...document.scripts].map((s) => ({ n: !!(s.nonce || s.getAttribute('nonce')), inline: !s.src })));
console.log('theme', theme, 'tabs', tabs.length, 'modal', modal);
console.log('inline scripts', scripts.filter((s) => s.inline).length, 'without nonce', scripts.filter((s) => !s.n).length);
console.log('CSP violations:', JSON.stringify(viol));
console.log('console problems:', JSON.stringify(problems));
await b.close();
process.exit(viol.length || problems.some((x) => /Content Security|CSP/i.test(x)) ? 1 : 0);
