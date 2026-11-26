// Minimal server-rendered parent page. No scripts, escaped output only.
// The full notice text lives in docs/legal/02 (privacy) and 04 (parent notice);
// replace the placeholders before launch.
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export type ConsentPage =
  | { kind: 'ask'; token: string; displayName: string }
  | { kind: 'withdraw'; token: string; displayName: string }
  | { kind: 'done'; outcome: string }
  | { kind: 'invalid' };

const shell = (body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NumberCraft parental consent</title>` +
  `<style>body{font:16px/1.5 system-ui,sans-serif;max-width:34rem;margin:2rem auto;padding:0 1rem;color:#1c232b}button{font:inherit;padding:.6rem 1.2rem;margin:.3rem .3rem .3rem 0;border-radius:.5rem;border:1px solid #1d4ed8;background:#fff;cursor:pointer}button.y{background:#1d4ed8;color:#fff}</style></head><body>${body}</body></html>`;

export function renderConsentPage(p: ConsentPage): string {
  if (p.kind === 'invalid') {
    return shell('<h1>Link not valid</h1><p>This link is invalid, expired or already used. Nothing has been saved online.</p>');
  }
  if (p.kind === 'done') {
    const msg: Record<string, string> = {
      granted: 'Thank you. Consent is recorded. You can withdraw it later from the email we sent you.',
      declined: 'Understood. No account data will be used and the child will not appear on leaderboards.',
      withdrawn: 'Consent withdrawn. The scores have been erased.',
      expired: 'This link has expired.',
      invalid: 'This link is invalid or already used.',
    };
    return shell(`<h1>NumberCraft</h1><p>${esc(msg[p.outcome] ?? msg.invalid)}</p>`);
  }
  const name = esc(p.displayName);
  const form = (buttons: string) =>
    `<form method="post"><input type="hidden" name="t" value="${esc(p.token)}">${buttons}</form>`;
  if (p.kind === 'withdraw') {
    return shell(
      `<h1>Withdraw consent</h1><p>Withdraw consent for <b>${name}</b>? Their scores will be erased.</p>` +
        form('<button name="decision" value="withdraw" class="y">Yes, withdraw</button>')
    );
  }
  return shell(
    `<h1>Parental consent</h1><p>The account <b>${name}</b> was requested by a child using your email as a parent or guardian contact. ` +
      `NumberCraft is a children's maths game by [COMPANY LEGAL NAME]. If you agree we store the child's email, display name, age group and game scores, ` +
      `and show display name and scores to other signed-in players on a leaderboard. No ads, no tracking. Withdraw any time.</p>` +
      `<p>By choosing Yes you confirm you are the parent or lawful guardian of this child and are 18 or over.</p>` +
      form('<button name="decision" value="yes" class="y">Yes, I agree</button><button name="decision" value="no">No</button>')
  );
}
