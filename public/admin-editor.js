(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const ed = $('editor');
  let keywords = window.__keywords || [];
  let mediaTarget = null; // callback receiving picked url
  let dirty = false;

  // ---- keywords: collapsed preview + modal ----
  function renderKwPreview() {
    const el = $('kwPreview');
    if (!keywords.length) { el.innerHTML = '<span class="meta">Click to add / view all keywords…</span>'; return; }
    const shown = keywords.slice(0, 6);
    el.innerHTML = shown.map((k) => `<span class="pill">${esc(k)}</span>`).join(' ') +
      (keywords.length > 6 ? ` <b style="color:var(--primary)">+${keywords.length - 6} more</b>` : '');
  }
  function renderKwList() {
    $('kwList').innerHTML = keywords.map((k, i) =>
      `<span class="pill" style="padding:5px 10px;">${esc(k)} <a href="#" data-i="${i}" style="color:var(--bad);text-decoration:none;">✕</a></span>`).join('');
  }
  $('kwPreview').onclick = () => { renderKwList(); $('kwModal').classList.add('open'); $('kwInput').focus(); };
  $('kwList').onclick = (e) => {
    const a = e.target.closest('a[data-i]'); if (!a) return;
    e.preventDefault(); keywords.splice(Number(a.dataset.i), 1); dirty = true; renderKwList(); renderKwPreview();
  };
  $('kwInput').onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.target.value.split(',').map((s) => s.trim()).filter(Boolean).forEach((k) => {
      if (!keywords.includes(k)) keywords.push(k);
    });
    e.target.value = ''; dirty = true; renderKwList(); renderKwPreview();
  };
  renderKwPreview();

  // ---- media picker ----
  async function loadMedia() {
    const r = await fetch('/api/admin/upload'); const list = await r.json();
    $('mGrid').innerHTML = list.length ? list.map((m) =>
      `<img src="/uploads/${m.filename}" data-url="/uploads/${m.filename}" title="${esc(m.original_name)}" alt="${esc(m.original_name)}" loading="lazy">`).join('')
      : '<p class="meta">No images yet — upload one above.</p>';
  }
  function openMedia(cb) { mediaTarget = cb; loadMedia(); $('mediaModal').classList.add('open'); }
  $('mGrid').onclick = (e) => {
    const img = e.target.closest('img[data-url]'); if (!img || !mediaTarget) return;
    mediaTarget(img.dataset.url, img.alt.replace(/\.[^.]+$/, '')); dirty = true; $('mediaModal').classList.remove('open');
  };
  async function uploadFiles(files) {
    if (!files.length) return;
    const fd = new FormData();
    for (const f of files) fd.append('files', f);
    toast('Uploading & converting to webp…');
    const res = await (await fetch('/api/admin/upload', { method: 'POST', body: fd })).json();
    const errs = res.filter((r) => r.error); if (errs.length) alert(errs.map((x) => x.error).join('\n'));
    loadMedia();
  }
  $('mUp').onchange = async () => { await uploadFiles($('mUp').files); $('mUp').value = ''; };
  const drop = document.querySelector('#mediaModal .drop');
  drop.ondragover = (e) => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = (e) => { e.preventDefault(); drop.classList.remove('over'); uploadFiles(e.dataTransfer.files); };

  // ---- featured image ----
  function setFeat(url) {
    $('f_featured_image').value = url;
    $('featPreview').src = url || '';
    $('featPreview').style.display = url ? 'block' : 'none';
    $('pickFeat').style.display = url ? 'none' : 'block';
    updateSerp();
  }
  const pickFeat = () => openMedia((url) => setFeat(url));
  $('pickFeat').onclick = pickFeat;
  $('changeFeat').onclick = pickFeat;
  $('featPreview').onclick = pickFeat;
  $('clearFeat').onclick = () => { setFeat(''); dirty = true; };
  $('pickOg').onclick = () => openMedia((url) => { $('s_ogImage').value = url; });
  // The rich editor's toolbar clicks this hidden button.
  $('insertImg').onclick = () => openMedia((url, alt) => {
    if (window.__rte) return window.__rte.insertImage(url, alt);
    const ta = $('f_body'), pos = ta.selectionStart || ta.value.length;
    ta.value = ta.value.slice(0, pos) + `\n<img src="${url}" alt="" loading="lazy" />\n` + ta.value.slice(pos);
  });

  // ---- excerpt word counter ----
  const exEl = $('f_excerpt'), exCount = $('excerptCount');
  function countExcerpt() {
    const n = exEl.value.trim() ? exEl.value.trim().split(/\s+/).length : 0;
    const ok = n >= 15 && n <= 20;
    exCount.textContent = n === 0
      ? 'Empty — the first 20 words of the body will be used instead.'
      : `${n} words${ok ? ' ✓' : n < 15 ? ' — a little short (aim for 15–20)' : ' — a little long (aim for 15–20)'}`;
    exCount.style.color = n === 0 ? '' : ok ? 'var(--ok)' : 'var(--warn)';
  }
  exEl.addEventListener('input', countExcerpt);
  countExcerpt();

  // ---- live Google preview ----
  const slugify = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96);
  function updateSerp() {
    const slug = $('f_slug').value || slugify($('f_title').value) || 'your-post';
    const base = ed.dataset.type === 'page' ? '' : ' › news';
    $('serpUrl').textContent = `propaknews.com${base} › ${slug}`;
    const t = $('s_metaTitle').value || $('f_title').value || 'Your headline appears here';
    $('serpTitle').textContent = t.length > 62 ? t.slice(0, 60) + '…' : t;
    const d = $('s_metaDesc').value || $('f_excerpt').value || 'Add a standfirst or meta description to control what Google shows here.';
    $('serpDesc').textContent = d.length > 160 ? d.slice(0, 157) + '…' : d;
  }
  ['f_title', 'f_slug', 'f_excerpt', 's_metaTitle', 's_metaDesc'].forEach((id) => $(id).addEventListener('input', updateSerp));
  updateSerp();

  // ---- unsaved changes guard ----
  $('editor').addEventListener('input', () => { dirty = true; });
  $('rte') && new MutationObserver(() => { dirty = true; }).observe($('rte'), { subtree: true, characterData: true, childList: true });
  setTimeout(() => { dirty = false; }, 400); // ignore the editor's own first render
  window.addEventListener('beforeunload', (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---- save ----
  async function save() {
    const btn = $('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';
    const body = {
      id: Number(ed.dataset.id) || undefined,
      type: ed.dataset.type,
      title: $('f_title').value, slug: $('f_slug').value, excerpt: $('f_excerpt').value,
      body: $('f_body').value, status: $('f_status').value,
      category: $('f_category') ? $('f_category').value : 'General',
      featured_image: $('f_featured_image').value,
      published_at: $('f_published_at').value,
      seo: {
        author: $('s_author').value,
        metaTitle: $('s_metaTitle').value, metaDesc: $('s_metaDesc').value,
        canonical: $('s_canonical').value, noindex: $('s_noindex').checked,
        keywords,
        ogTitle: $('s_ogTitle').value, ogDesc: $('s_ogDesc').value,
        ogImage: $('s_ogImage').value, twitterCard: $('s_twitterCard').value,
      },
    };
    try {
      const r = await api('/api/admin/posts', body);
      if (!ed.dataset.id && r.id) {
        history.replaceState(null, '', `?id=${r.id}`); ed.dataset.id = r.id;
      }
      if (r.post) $('f_slug').value = r.post.slug;
      const slug = (r.post && r.post.slug) || $('f_slug').value;
      const url = `${ed.dataset.type === 'page' ? '/' : '/news/'}${slug}/`;
      $('viewLink').innerHTML = body.status === 'published'
        ? `Published · <a href="${url}" target="_blank">View live ↗</a>` : `Draft saved at ${new Date().toLocaleTimeString()}`;
      dirty = false;
      updateSerp();
      toast(body.status === 'published' ? 'Published' : 'Draft saved');
    } finally {
      btn.disabled = false; btn.textContent = 'Save';
    }
  }
  $('saveBtn').onclick = save;
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach((m) => m.classList.remove('open'));
  });
})();
