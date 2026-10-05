// Tableau de bord du réseau : interroge un nœud public (config.js, ou ?api=… / champ
// « Nœud ») toutes les quelques secondes. Textes FR ou EN selon <html lang>.
'use strict';
(() => {
  const EN = document.documentElement.lang === 'en';
  const L = EN ? 'en-US' : 'fr-FR';
  const T = EN ? {
    none: 'No public node configured yet — the testnet opens soon. Enter a node address above to try one.',
    down: 'Node unreachable', on: (c, p) => `Online · chain ${c} · protocol ${p}`, upg: ' · upgrade pending',
    ago: (s) => s < 60 ? `${s} s ago` : s < 3600 ? `${Math.round(s / 60)} min ago` : `${Math.round(s / 3600)} h ago`,
    yes: 'online', no: 'offline', next: 'next', jail: 'suspended', empty: 'No block yet.',
  } : {
    none: 'Aucun nœud public configuré pour l’instant : le testnet ouvre bientôt. Saisissez l’adresse d’un nœud ci-dessus pour en essayer un.',
    down: 'Nœud injoignable', on: (c, p) => `En ligne · chaîne ${c} · protocole ${p}`, upg: ' · mise à jour en attente',
    ago: (s) => s < 60 ? `il y a ${s} s` : s < 3600 ? `il y a ${Math.round(s / 60)} min` : `il y a ${Math.round(s / 3600)} h`,
    yes: 'en ligne', no: 'hors ligne', next: 'prochain', jail: 'suspendu', empty: 'Aucun bloc pour l’instant.',
  };
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const n = (x) => Number(x).toLocaleString(L);
  const short = (a, k = 6) => a.length > 20 ? a.slice(0, 5 + k) + '…' + a.slice(-k) : a;
  const vinx = (s) => n(Math.round(Number(String(s).split(' ')[0])));
  const atoms = (a, d = 4) => (Number(a) / 1e9).toLocaleString(L, { maximumFractionDigits: d });

  const qs = new URLSearchParams(location.search).get('api');
  let saved = '';
  try { saved = localStorage.getItem('vinx-api') || ''; } catch (_) {}
  let api = (qs || saved || window.VINX_API || '').trim().replace(/\/$/, '');
  $('api').value = api;
  $('api-form').onsubmit = (e) => {
    e.preventDefault();
    api = $('api').value.trim().replace(/\/$/, '');
    try { api && api !== window.VINX_API ? localStorage.setItem('vinx-api', api) : localStorage.removeItem('vinx-api'); } catch (_) {}
    blocks.clear();
    tick();
  };

  const blocks = new Map(); // height → block (the last 12)
  let timer = null;

  function state(cls, text) {
    $('d-state').className = 'live-state ' + cls;
    $('d-txt').textContent = text;
  }

  async function tick() {
    clearTimeout(timer);
    if (!api) { state('', T.none); return; }
    const get = (p) => fetch(api + p, { cache: 'no-store' }).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    let every = 5000;
    try {
      const [h, v, s] = await Promise.all([get('/health'), get('/validators'), get('/network/stats')]);
      every = Math.max(2000, Math.min(12000, (h.block_time_secs || 12) * 1000 / 2));
      state('on', T.on(h.chain_id, h.protocol) + (h.upgrade_required ? T.upg : ''));
      const age = Math.max(0, Math.round(Date.now() / 1000 - h.tip_timestamp));
      $('k-height').textContent = '#' + n(h.height);
      $('k-final').textContent = '#' + n(h.finalized_height);
      $('k-age').textContent = T.ago(age);
      $('k-bt').textContent = h.block_time_secs + ' s';
      $('k-vals').textContent = n(v.count);
      $('k-quorum').textContent = n(v.quorum) + ' / ' + n(v.total_power);
      $('k-mempool').textContent = n(h.mempool_pending);
      $('k-fee').textContent = atoms(s.base_fee_atoms) + ' VINX';
      $('k-supply').textContent = vinx(s.circulating_supply);
      $('k-left').textContent = vinx(s.remaining_supply);

      // Fetch only the blocks we don't have yet.
      const want = [];
      for (let i = h.height; i > Math.max(0, h.height - 12); i--) if (!blocks.has(i)) want.push(i);
      const got = await Promise.all(want.map((i) => get('/block/' + i).catch(() => null)));
      got.forEach((b) => b && blocks.set(b.height, b));
      [...blocks.keys()].filter((k) => k <= h.height - 12 || k > h.height).forEach((k) => blocks.delete(k));
      const rows = [...blocks.values()].sort((a, b) => b.height - a.height);
      $('d-blocks').innerHTML = rows.length ? rows.map((b) => `<tr>
          <td class="mono">#${n(b.height)}</td>
          <td>${new Date(b.timestamp * 1000).toLocaleTimeString(L)}</td>
          <td class="mono" title="${esc(b.validator)}">${esc(short(b.validator))}</td>
          <td class="num">${n(b.tx_count)}</td>
          <td class="num">${n(b.signatures_count)}</td>
          <td class="mono hash" title="${esc(b.hash)}">${esc(b.hash.slice(0, 12))}…</td></tr>`).join('')
        : `<tr><td colspan="6">${T.empty}</td></tr>`;

      $('d-vals').innerHTML = v.validators.map((x) => `<tr>
          <td class="mono" title="${esc(x.address)}">${esc(short(x.address, 4))}${x.is_next_leader ? ` <span class="tag">${T.next}</span>` : ''}</td>
          <td class="num">${n(x.power)}</td>
          <td class="num">${n(x.missed_proposals)}</td>
          <td><span class="pill ${x.suspended ? 'warn' : x.online ? 'ok' : 'off'}">${x.suspended ? T.jail : x.online ? T.yes : T.no}</span></td></tr>`).join('');
    } catch (_) {
      state('err', T.down + ' · ' + api);
      every = 10000;
    }
    timer = setTimeout(tick, every);
  }
  tick();
})();
