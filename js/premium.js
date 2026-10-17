(() => {
  const { $, store, toast, copyText, call, showError, showNote, busy, h, isUrl, fmt, fieldError, block, pairs, listRows, tag, details, carousel, initTabs } = window.FP;
  const EMAIL_STORE = 'freeprem_email';
  const emailInput = $('email');
  emailInput.value = store.get(EMAIL_STORE);
  const readEmail = () => emailInput.value.trim();

  function go(step, focus) {
    [1, 2, 3, 4].forEach(n => { $('p' + n).hidden = n !== step; });
    document.querySelectorAll('#steps li').forEach((item, index) => {
      const n = index + 1;
      item.classList.toggle('is-active', step < 4 && n === step);
      item.classList.toggle('is-done', n < step || step === 4);
    });
    showError($('amMsg'), '');
    if (focus) {
      const target = { 1: emailInput, 2: $('btnNext'), 3: $('link'), 4: $('p4').querySelector('h2') }[step];
      if (target) target.focus();
    }
  }

  document.querySelectorAll('[data-go]').forEach(button => {
    button.addEventListener('click', () => go(Number(button.dataset.go), true));
  });

  async function sendLink(resend) {
    const email = readEmail();
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      showError($('amMsg'), 'Masukkan alamat email yang valid.');
      emailInput.focus();
      return;
    }
    const button = resend ? $('btnResend') : $('btnSend');
    try {
      await busy(button, 'Mengirim', async () => {
        await call('/alightmotion/send', { email });
        store.set(EMAIL_STORE, email);
        $('sentTo').textContent = email;
        go(2, true);
        if (resend) toast('Link dikirim ulang');
      });
    } catch (error) {
      showError($('amMsg'), error.message);
    }
  }

  $('p1').addEventListener('submit', event => { event.preventDefault(); sendLink(false); });
  $('btnResend').addEventListener('click', () => sendLink(true));
  $('btnNext').addEventListener('click', () => go(3, true));

  $('pasteLink').addEventListener('click', async () => {
    try {
      $('link').value = (await navigator.clipboard.readText()).trim();
      $('link').focus();
    } catch {
      toast('Izin tempel ditolak. Tempel manual di kolom.');
    }
  });

  $('p3').addEventListener('submit', async event => {
    event.preventDefault();
    const link = $('link').value.trim();
    if (!link) {
      showError($('amMsg'), 'Tempel link dari Gmail terlebih dahulu.');
      $('link').focus();
      return;
    }
    try {
      await busy($('btnVerify'), 'Memverifikasi', async () => {
        const json = await call('/alightmotion/verify', { email: readEmail(), link });
        const data = json.data || {};
        $('doneEmail').textContent = readEmail();
        $('doneDuration').textContent = data.duration ? data.duration.replace('_', ' ') : '-';
        $('link').value = '';
        go(4, true);
      });
    } catch (error) {
      showError($('amMsg'), error.message);
    }
  });

  function credRow(label, value) {
    const row = document.createElement('li');
    const group = document.createElement('div');
    group.className = 'cred-main';
    const name = document.createElement('span');
    name.className = 'cred-label';
    name.textContent = label;
    const text = document.createElement('span');
    text.className = 'cred-value';
    text.textContent = value;
    group.append(name, text);
    const copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn-inline';
    copy.textContent = 'Salin';
    copy.setAttribute('aria-label', 'Salin ' + label);
    copy.addEventListener('click', async () => {
      const ok = await copyText(value);
      toast(ok ? label + ' disalin' : 'Gagal menyalin');
    });
    row.append(group, copy);
    return row;
  }

  $('btnViu').addEventListener('click', async () => {
    $('viuOut').innerHTML = '';
    showError($('viuMsg'), '');
    try {
      await busy($('btnViu'), 'Memproses', async () => {
        const json = await call('/viu');
        const account = (json.result || {}).account || {};
        const list = document.createElement('ul');
        list.className = 'cred';
        list.append(credRow('Email', account.email || '-'), credRow('Password', account.password || '-'));
        $('viuOut').appendChild(list);
      });
      $('btnViu').textContent = 'Buat akun baru';
    } catch (error) {
      showError($('viuMsg'), error.message);
    }
  });

  go(1, false);
  initTabs(['am', 'viu'], 'am');
})();
