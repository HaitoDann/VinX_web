// Thème, menu mobile et état du réseau en direct (si un nœud public est configuré).
'use strict';
const $ = (id) => document.getElementById(id);

$('theme').onclick = () => {
  const dark = getComputedStyle(document.documentElement).colorScheme.includes('dark');
  const t = dark ? 'light' : 'dark';
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem('vinx-theme', t); } catch (_) {}
};

const nav = $('nav');
$('menu').onclick = () => nav.classList.toggle('open');
nav.querySelectorAll('a').forEach((a) => (a.onclick = () => nav.classList.remove('open')));

const EN = document.documentElement.lang === 'en';
const fmt = (n) => Number(n).toLocaleString(EN ? 'en-US' : 'fr-FR');

async function live() {
  const api = (window.VINX_API || '').replace(/\/$/, '');
  if (!api) return;
  try {
    const get = (p) => fetch(api + p, { cache: 'no-store' }).then((r) => r.json());
    const [h, v, s] = await Promise.all([get('/health'), get('/validators'), get('/network/stats')]);
    const age = Math.max(0, Math.round(Date.now() / 1000 - h.tip_timestamp));
    $('l-height').textContent = '#' + fmt(h.height);
    $('l-vals').textContent = fmt(v.count);
    $('l-block').textContent = EN
      ? (age < 60 ? `${age} s ago` : `${Math.round(age / 60)} min ago`)
      : (age < 60 ? `il y a ${age} s` : `il y a ${Math.round(age / 60)} min`);
    $('l-supply').textContent = fmt(Math.round(Number(s.circulating_supply.split(' ')[0])));
    $('live-state').classList.add('on');
    $('live-txt').textContent = EN ? `Testnet online · chain ${h.chain_id}` : `Testnet en ligne · chaîne ${h.chain_id}`;
  } catch (_) {
    $('live-txt').textContent = EN ? 'Testnet unreachable for now.' : 'Testnet momentanément injoignable.';
  }
}
live();
setInterval(live, 12000);
