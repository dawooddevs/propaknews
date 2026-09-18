(() => {
  const $ = (id) => document.getElementById(id);
  const ed = $('editor');
  let keywords = window.__keywords || [];
  let mediaTarget = null; // callback receiving picked url

  // ---- keywords: collapsed preview + modal ----
  function renderKwPreview() {
    const el = $('kwPreview');
    if (!keywords.length) { el.innerHTML = '<span class="meta">Click to add / view all keywords…</span>'; return; }
    const shown = keywords.slice(0, 6);
    el.innerHTML = shown.map((k) => `<span class="pill">${k}</span>`).join(' ') +
      (keywords.length > 6 ? ` <b style="color:var(--primary)">+${keywords.length - 6} more — click to expand</b>` : '');
  }
  function renderKwList() {
    $('kwList').innerHTML = keywords.map((k, i) =>
      `<span class="pill" style="padding:5px 10px;">${k} <a href="#" data-i="${i}" style="color:#a00000;text-decoration:none;">✕</a></span>`).join('');
  }
  $('kwPreview').onclick = () => { renderKwList(); $('kwModal').classList.add('open'); };
  $('kwList').onclick = (e) => {
    const a = e.target.closest('a[data-i]'); if (!a) return;
    e.preventDefault(); keywords.splice(Number(a.dataset.i), 1); renderKwList(); renderKwPreview();
  };
  $('kwInput').onkeydown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    e.target.value.split(',').map((s) => s.trim()).filter(Boolean).forEach((k) => {
      if (!keywords.includes(k)) keywords.push(k);
    });
    e.target.value = ''; renderKwList(); renderKwPreview();
  };
  renderKwPreview();

  // ---- media picker ----
  async function loadMedia() {
    const r = await fetch('/api/admin/upload'); const list = await r.json();
    $('mGrid').innerHTML = list.map((m) =>
      `<img src="/uploads/${m.filename}" data-url="/uploads/${m.filename}" title="${m.original_name}"
        style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:4px;cursor:pointer;border:2px solid transparent;">`).join('');
  }
  function openMedia(cb) { mediaTarget = cb; loadMedia(); $('mediaModal').classList.add('open'); }
  $('mGrid').onclick = (e) => {
    const img = e.target.closest('img[data-url]'); if (!img || !mediaTarget) return;
    mediaTarget(img.dataset.url); $('mediaModal').classList.remove('open');
  };
  $('mUp').onchange = async () => {
    const fd = new FormData();
    for (const f of $('mUp').files) fd.append('files', f);
    toast('Uploading & converting to webp…');
    await fetch('/api/admin/upload', { method: 'POST', body: fd });
    $('mUp').value = ''; loadMedia();
  };
  $('pickFeat').onclick = () => openMedia((url) => {
    $('f_featured_image').value = url; $('featPreview').src = url; $('featPreview').style.display = 'block';
  });
  $('clearFeat').onclick = () => { $('f_featured_image').value = ''; $('featPreview').style.display = 'none'; };
  $('pickOg').onclick = () => openMedia((url) => { $('s_ogImage').value = url; });
  $('insertImg').onclick = () => openMedia((url) => {
    const ta = $('f_body'), pos = ta.selectionStart || ta.value.length;
    const tag = `\n<img src="${url}" alt="" loading="lazy" />\n`;
    ta.value = ta.value.slice(0, pos) + tag + ta.value.slice(pos);
  });

  // ---- save ----
  $('saveBtn').onclick = async () => {
    const body = {
      id: Number(ed.dataset.id) || undefined,
      type: ed.dataset.type,
      title: $('f_title').value, slug: $('f_slug').value, excerpt: $('f_excerpt').value,
      body: $('f_body').value, status: $('f_status').value,
      category: $('f_category') ? $('f_category').value : 'General',
      featured_image: $('f_featured_image').value,
      published_at: $('f_published_at').value,
      seo: {
        metaTitle: $('s_metaTitle').value, metaDesc: $('s_metaDesc').value,
        canonical: $('s_canonical').value, noindex: $('s_noindex').checked,
        keywords,
        ogTitle: $('s_ogTitle').value, ogDesc: $('s_ogDesc').value,
        ogImage: $('s_ogImage').value, twitterCard: $('s_twitterCard').value,
      },
    };
    const r = await api('/api/admin/posts', body);
    if (!ed.dataset.id && r.id) {
      history.replaceState(null, '', `?id=${r.id}`); ed.dataset.id = r.id;
    }
    if (r.post) $('f_slug').value = r.post.slug;
    const slug = (r.post && r.post.slug) || $('f_slug').value;
    $('viewLink').innerHTML = body.status === 'published'
      ? `<a href="${ed.dataset.type === 'page' ? '/' : '/news/'}${slug}/" target="_blank">View live ↗</a>` : 'Saved as draft';
    toast('Saved');
  };
})();
