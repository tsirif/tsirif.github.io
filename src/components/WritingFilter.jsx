import { useEffect, useMemo, useState } from "react";
import MiniSearch from "minisearch";

/** items = [{ id, title, summary, keywords: [lowercase], date }] */
export default function WritingFilter({
  items,
  listSelector = '.projects-grid[data-list="writing"]',
  counterSelector = '#writing-count',
  emptySelector = '#writing-empty'
}) {
  const mini = useMemo(() => {
    const ms = new MiniSearch({
      fields: ["title", "summary", "keywords"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2 }
    });
    ms.addAll(items);
    return ms;
  }, [items]);

  const allTags = useMemo(() => {
    const s = new Set();
    items.forEach(i => (i.keywords || []).forEach(k => s.add(k)));
    return Array.from(s).sort();
  }, [items]);

  const [open, setOpen] = useState(false);      // hidden by default
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [sort, setSort] = useState("newest");   // newest | relevance
  const [visibleIds, setVisibleIds] = useState(items.map(i => i.id));

  const toggleTag = (tag) => {
    const next = new Set(selected);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    setSelected(next);
  };
  const clearFilters = () => { setSelected(new Set()); setQuery(""); setSort("newest"); };

  useEffect(() => {
    let ids;
    if (query.trim()) {
      ids = mini.search(query.trim()).map(r => r.id);
      if (selected.size) {
        ids = ids.filter(id => {
          const item = items.find(i => i.id === id);
          const kws = new Set(item?.keywords || []);
          for (const t of selected) if (!kws.has(t)) return false;
          return true;
        });
      }
      if (sort !== "relevance") {
        const m = new Map(items.map(i => [i.id, i]));
        ids.sort((A,B) => new Date(m.get(B).date) - new Date(m.get(A).date));
      }
    } else {
      ids = items.map(i => i.id);
      ids.sort((A,B) => new Date(items.find(i=>i.id===B).date) - new Date(items.find(i=>i.id===A).date));
      if (selected.size) {
        ids = ids.filter(id => {
          const item = items.find(i => i.id === id);
          const kws = new Set(item?.keywords || []);
          for (const t of selected) if (!kws.has(t)) return false;
          return true;
        });
      }
    }
    setVisibleIds(ids);
  }, [query, selected, sort, items, mini]);

  useEffect(() => {
    const container = document.querySelector(listSelector);
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('[data-slug]'));
    const byId = new Map(cards.map(el => [el.getAttribute('data-slug'), el]));

    const show = new Set(visibleIds);
    cards.forEach(el => { el.hidden = !show.has(el.getAttribute('data-slug')); });

    visibleIds.forEach(id => { const el = byId.get(id); if (el) container.appendChild(el); });

    const empty = document.querySelector(emptySelector);
    if (empty) empty.hidden = visibleIds.length > 0;

    const counter = document.querySelector(counterSelector);
    if (counter) counter.textContent = `${visibleIds.length} of ${items.length}`;
  }, [visibleIds, items.length, listSelector, counterSelector, emptySelector]);

  return (
    <section aria-label="Writing filters">
      <div className="filter-toggle" style={{margin: '8px 0'}}>
        <button className="btn btn--ghost small" type="button"
                aria-expanded={open ? "true" : "false"}
                onClick={() => setOpen(o => !o)}>
          {open ? "Hide filters" : "Show filters"}
        </button>
        <small className="muted" style={{marginLeft: 8}}>
          Showing <span id="writing-count">{items.length} of {items.length}</span>
        </small>
      </div>

      {open && (
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search title or summary…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search writing"
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort posts">
            <option value="newest">Newest</option>
            <option value="relevance">Relevance</option>
          </select>
          <button className="btn btn--ghost small" onClick={clearFilters} type="button">Clear</button>

          <div className="chips" style={{ marginTop: 8 }}>
            {allTags.map(tag => {
              const active = selected.has(tag);
              return (
                <button key={tag} type="button" className="tag"
                        aria-pressed={active ? "true" : "false"}
                        onClick={() => toggleTag(tag)}>
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
