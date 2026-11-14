// Sources & credits: collapsible groups with counts, plus a filter box.
export function initSourceAccordions() {
  const accs = [...document.querySelectorAll('[data-acc]')];
  if (!accs.length) return;
  const items = (acc) => [...acc.querySelectorAll('.acc-inner li')];
  const setOpen = (acc, open) => {
    acc.classList.toggle('open', open);
    acc.querySelector('.acc-btn').setAttribute('aria-expanded', String(open));
    acc.querySelector('.acc-panel').inert = !open;
  };
  accs.forEach((acc) => {
    acc.querySelector('[data-count]').textContent = items(acc).length;
    setOpen(acc, false);
    acc.querySelector('.acc-btn').addEventListener('click', () => { setOpen(acc, !acc.classList.contains('open')); syncAll(); });
  });
  const allBtn = document.getElementById('src-toggle-all');
  const syncAll = () => { if (allBtn) allBtn.textContent = accs.every((a) => a.hidden || a.classList.contains('open')) ? 'Close all' : 'Open all'; };
  allBtn?.addEventListener('click', () => { const open = allBtn.textContent === 'Open all'; accs.forEach((a) => !a.hidden && setOpen(a, open)); syncAll(); });

  const input = document.getElementById('src-filter'), status = document.getElementById('src-filter-status');
  let t = 0;
  input?.addEventListener('input', () => { clearTimeout(t); t = setTimeout(apply, 120); });
  input?.addEventListener('keydown', (e) => { if (e.key === 'Escape' && input.value) { e.stopPropagation(); input.value = ''; apply(); } });
  function apply() {
    const q = input.value.trim().toLowerCase();
    let total = 0;
    accs.forEach((acc) => {
      const li = items(acc); let n = 0;
      li.forEach((x) => { const hit = !q || x.textContent.toLowerCase().includes(q); x.hidden = !hit; if (hit) n++; });
      acc.querySelector('[data-count]').textContent = q ? `${n}/${li.length}` : li.length;
      acc.hidden = !!q && n === 0;
      setOpen(acc, !!q && n > 0);
      total += n;
    });
    status.textContent = q ? (total ? `${total} matching source${total === 1 ? '' : 's'}` : 'No sources match — try another word.') : '';
    syncAll();
  }
}
