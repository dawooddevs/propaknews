(() => {
  const type = document.currentScript.dataset.type || 'post';
  const rows = document.getElementById('rows'), endEl = document.getElementById('end');
  let tab = 'all', q = '', offset = 0, busy = false, done = false;
  const editBase = type === 'page' ? '/admin/pages/edit/' : '/admin/posts/edit/';

  async function load(reset) {
    if (busy || (done && !reset)) return;
    busy = true;
    if (reset) { offset = 0; done = false; rows.innerHTML = ''; endEl.textContent = ''; }
    const r = await fetch(`/api/admin/posts?type=${type}&tab=${tab}&q=${encodeURIComponent(q)}&offset=${offset}`);
    const list = await r.json();
    for (const p of list) {
      const tr = document.createElement('tr');
      const actions = p.status === 'trash'
        ? `<button class="btn sm gray" data-act="draft" data-id="${p.id}">Restore</button>
           <button class="btn sm red" data-act="delete" data-id="${p.id}">Delete forever</button>`
        : `<a class="btn sm" href="${editBase}?id=${p.id}">Edit</a>
           <button class="btn sm red" data-act="trash" data-id="${p.id}">Trash</button>`;
      tr.innerHTML = `<td>${p.id}</td><td><a href="${editBase}?id=${p.id}">${p.title || '(no title)'}</a></td>
        <td>${p.category}</td><td><span class="pill ${p.status}">${p.status}</span></td>
        <td>${p.published_at}</td><td style="white-space:nowrap">${actions}</td>`;
      rows.appendChild(tr);
    }
    offset += list.length;
    if (list.length < 30) { done = true; endEl.textContent = offset ? 'End of list' : 'Nothing found'; }
    busy = false;
  }

  rows.addEventListener('click', async (e) => {
    const b = e.target.closest('button[data-act]'); if (!b) return;
    const act = b.dataset.act, id = Number(b.dataset.id);
    if (act === 'delete') {
      if (!confirm('Permanently delete this item? This cannot be undone.')) return;
      await api('/api/admin/posts', { action: 'delete', id });
    } else await api('/api/admin/posts', { action: 'status', id, status: act });
    load(true);
  });
  document.getElementById('tabs').addEventListener('click', (e) => {
    const a = e.target.closest('a[data-tab]'); if (!a) return;
    e.preventDefault();
    document.querySelectorAll('#tabs a').forEach((x) => x.classList.remove('on'));
    a.classList.add('on'); tab = a.dataset.tab; load(true);
  });
  let t; document.getElementById('q').addEventListener('input', (e) => {
    clearTimeout(t); t = setTimeout(() => { q = e.target.value; load(true); }, 300);
  });
  window.addEventListener('scroll', () => {
    if (window.innerHeight + window.scrollY > document.body.offsetHeight - 400) load(false);
  });
  load(true);
})();
