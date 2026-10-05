// Démo de paiement : la caisse encode un URI de paiement VinX dans un QR code, le
// « téléphone » simule la signature, l'envoi et l'inclusion dans un bloc. Aucune
// transaction réelle. Textes en français ou en anglais selon <html lang>.
'use strict';
(() => {
  const EN = document.documentElement.lang === 'en';
  const T = EN ? {
    shop: 'Harbour Bakery', waiting: 'Waiting for payment…', received: 'Payment received — final',
    payTo: 'Pay', ref: 'Reference', fee: 'Network fee', pay: 'Confirm and pay',
    signing: 'Signing on the device…', sending: 'Sending to the network…',
    block: (s) => `Waiting for the next block… ${s} s`, paid: 'Paid',
    paidSub: (b) => `Final in block #${b} · signed by 4 of 4 validators`,
    again: 'New payment', scan: 'QR code scanned', invalid: 'Enter a valid amount',
    dec: '.', sep: ',',
  } : {
    shop: 'Boulangerie du Port', waiting: 'En attente du paiement…', received: 'Paiement reçu — définitif',
    payTo: 'Payer', ref: 'Référence', fee: 'Frais du réseau', pay: 'Confirmer et payer',
    signing: 'Signature sur l’appareil…', sending: 'Envoi au réseau…',
    block: (s) => `Bloc suivant dans ${s} s…`, paid: 'Payé',
    paidSub: (b) => `Définitif au bloc #${b} · signé par 4 validateurs sur 4`,
    again: 'Nouveau paiement', scan: 'QR code scanné', invalid: 'Saisissez un montant valide',
    dec: ',', sep: ' ',
  };
  const MERCHANT = 'vinx13gu9aq69uljey3y4yzyzfakrmwu3dyj2t26sut';
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  if (!$('d-screen')) return;

  let height = 24312 + Math.floor((Date.now() / 1000 - 1790000000) / 12) % 100000;
  let timer = null;

  // "12,40" → { atoms: 12400000000n, text: "12,40" } ; null if invalid.
  function amount() {
    const raw = $('d-amount').value.trim().replace(/\s/g, '').replace(',', '.');
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(raw) || Number(raw) <= 0) return null;
    const [w, f = ''] = raw.split('.');
    const whole = Number(w).toLocaleString(EN ? 'en-US' : 'fr-FR').replace(/,| | /g, T.sep);
    return { uri: raw, text: whole + T.dec + (f + '00').slice(0, 2) };
  }

  function render() {
    clearInterval(timer);
    $('d-qr').classList.remove('ok');
    const a = amount();
    const ref = $('d-ref').value.trim().slice(0, 32);
    const st = $('d-till-state');
    st.classList.remove('ok');
    if (!a) {
      $('d-till-amount').textContent = '—';
      $('d-till-txt').textContent = T.invalid;
      $('d-qr').querySelector('svg')?.remove();
      $('d-uri').textContent = '';
      $('d-screen').innerHTML = '';
      return;
    }
    // Payment URI: address, amount in VINX, memo (the reference).
    const uri = `vinx:${MERCHANT}?amount=${a.uri}` + (ref ? `&memo=${encodeURIComponent(ref)}` : '');
    const qr = qrcode(0, 'M');
    qr.addData(uri);
    qr.make();
    $('d-qr').querySelector('svg')?.remove();
    $('d-qr').insertAdjacentHTML('afterbegin', qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true }));
    $('d-uri').textContent = uri;
    $('d-till-amount').textContent = `${a.text} VINX`;
    $('d-till-txt').textContent = T.waiting;
    $('d-screen').innerHTML = `
      <div class="who">${T.scan}</div>
      <div><div class="who">${T.payTo} ${esc(T.shop)}</div><div class="amt">${a.text} <span class="who">VINX</span></div></div>
      <div class="rows">
        ${ref ? `<div><span>${T.ref}</span><span>${esc(ref)}</span></div>` : ''}
        <div><span>${T.fee}</span><span class="mono">0${T.dec}0001 VINX</span></div>
      </div>
      <div class="grow"></div>
      <div class="state" id="d-state"></div>
      <div class="progress"><i id="d-bar"></i></div>
      <button class="btn" id="d-pay">${T.pay}</button>`;
    $('d-pay').onclick = () => pay(a);
  }

  function pay(a) {
    $('d-pay').disabled = true;
    $('d-amount').disabled = $('d-ref').disabled = true;
    const steps = [[T.signing, 12], [T.sending, 30]];
    let i = 0;
    const next = () => {
      if (i < steps.length) {
        $('d-state').textContent = steps[i][0];
        $('d-bar').style.width = steps[i][1] + '%';
        i++;
        setTimeout(next, 650);
        return;
      }
      // The next block: compressed to 4 s for the demo (12 s on the network).
      let left = 4;
      $('d-state').textContent = T.block(left * 3);
      timer = setInterval(() => {
        left--;
        $('d-bar').style.width = 30 + (4 - left) * 17.5 + '%';
        if (left > 0) { $('d-state').textContent = T.block(left * 3); return; }
        clearInterval(timer);
        done(a);
      }, 1000);
    };
    next();
  }

  function done(a) {
    height++;
    $('d-screen').innerHTML = `
      <div class="done">
        <div class="check"><svg class="i" viewBox="0 0 24 24"><path d="m5 12 4.5 4.5L19 7"/></svg></div>
        <div class="amt">${a.text} <span class="who">VINX</span></div>
        <div><b>${T.paid}</b></div>
        <div class="who">${T.paidSub(height.toLocaleString(EN ? 'en-US' : 'fr-FR'))}</div>
      </div>
      <button class="btn ghost" id="d-again">${T.again}</button>`;
    $('d-qr').classList.add('ok');
    $('d-till-state').classList.add('ok');
    $('d-till-txt').textContent = T.received;
    $('d-again').onclick = () => {
      $('d-amount').disabled = $('d-ref').disabled = false;
      render();
    };
  }

  $('d-amount').addEventListener('input', render);
  $('d-ref').addEventListener('input', render);
  render();
})();
