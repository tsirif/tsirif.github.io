import { useEffect, useMemo, useState } from "react";

/** items = [{ id, keywords:[lowercase], date }] */
export default function ProjectsFilter({
  items,
  listSelector = '#projects-list',
  counterSelector = '#projects-count',
  emptySelector = '#projects-empty'
}) {
  // Stable newest→oldest order once, then we filter subsets in that order
  const baseOrder = useMemo(
    () => items.slice().sort((a,b) => new Date(b.date) - new Date(a.date)).map(i => i.id),
    [items]
  );

  // Unique tag list
  const allTags = useMemo(() => {
    const s = new Set();
    items.forEach(i => (i.keywords || []).forEach(k => s.add(k)));
    return Array.from(s).sort();
  }, [items]);

  const [open, setOpen] = useState(false);        // hidden by default
  const [selected, setSelected] = useState(new Set());
  const [visibleIds, setVisibleIds] = useState(baseOrder);

  const toggleTag = (tag) => {
    const next = new Set(selected);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    setSelected(next);
  };
  const clearFilters = () => { setSelected(new Set()); };

  // Compute visible ids: always in baseOrder (newest→oldest)
  useEffect(() => {
    if (!selected.size) { setVisibleIds(baseOrder); return; }
    const must = Array.from(selected);
    const byId = new Map(items.map(i => [i.id, i]));
    const filtered = baseOrder.filter(id => {
      const kws = new Set(byId.get(id)?.keywords || []);
      // AND semantics: all selected tags must be present
      return must.every(t => kws.has(t));
    });
    setVisibleIds(filtered);
  }, [selected, baseOrder, items]);

  // Apply to DOM (hide + reorder)
  useEffect(() => {
    let container = document.querySelector(listSelector)
      || document.querySelector('.projects-grid[data-list="projects"]')
      || document.querySelector('.projects-grid');
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('[data-slug]'));
    const byId = new Map(cards.map(el => [el.getAttribute('data-slug'), el]));

    const show = new Set(visibleIds);
    cards.forEach(el => { el.hidden = !show.has(el.getAttribute('data-slug')); });

    // Reorder to newest→oldest (baseOrder subset)
    visibleIds.forEach(id => {
      const el = byId.get(id);
      if (el) container.appendChild(el);
    });

    const empty = document.querySelector(emptySelector);
    if (empty) empty.hidden = visibleIds.length > 0;

    const counter = document.querySelector(counterSelector);
    if (counter) counter.textContent = `${visibleIds.length} of ${items.length}`;
  }, [visibleIds, items.length, listSelector, counterSelector, emptySelector]);

  return (
    <section aria-label="Project filters">
      <div className="filter-toggle" style={{margin: '8px 0'}}>
        <button className="btn btn--ghost small" type="button"
                aria-expanded={open ? "true" : "false"}
                onClick={() => setOpen(o => !o)}>
          {open ? "Hide filters" : "Show filters"}
        </button>
        <small className="muted" style={{marginLeft: 8}}>
          Showing <span id="projects-count">{items.length} of {items.length}</span>
        </small>
      </div>

      {open && (
        <div className="chips" style={{ marginTop: 8 }}>
          {allTags.map(tag => {
            const active = selected.has(tag);
            return (
              <button key={tag}
                      type="button"
                      className="tag"
                      aria-pressed={active ? "true" : "false"}
                      onClick={() => toggleTag(tag)}>
                {tag}
              </button>
            );
          })}
          {allTags.length > 0 && (
            <button className="btn btn--ghost small" style={{marginLeft:8}} onClick={clearFilters} type="button">
              Clear
            </button>
          )}
        </div>
      )}
    </section>
  );
}
