import { useEffect, useMemo, useState } from "react";
import MiniSearch from "minisearch";

/** items = [{ id, title, tldr, abstract, keywords: [lowercase], date, impact:{citations,github_stars} }] */
export default function ProjectsFilter({
  items,
  listSelector = '.projects-grid[data-list="projects"]',
  counterSelector = '#projects-count',
  emptySelector = '#projects-empty'
}) {
  // Build index once
  const mini = useMemo(() => {
    const ms = new MiniSearch({
      fields: ["title", "tldr", "abstract", "keywords"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2 }
    });
    ms.addAll(items);
    return ms;
  }, [items]);

  // Unique tag set
  const allTags = useMemo(() => {
    const s = new Set();
    items.forEach(i => (i.keywords || []).forEach(k => s.add(k)));
    return Array.from(s).sort();
  }, [items]);

  // UI state
  const [open, setOpen] = useState(false);                     // ← hidden by default
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set());
  const [sort, setSort] = useState("newest");                  // newest | relevance | citations | stars
  const [visibleIds, setVisibleIds] = useState(items.map(i => i.id));

  const toggleTag = (tag) => {
    const next = new Set(selected);
    next.has(tag) ? next.delete(tag) : next.add(tag);
    setSelected(next);
  };
  const clearFilters = () => {
    setSelected(new Set());
    setQuery("");
    setSort("newest");
  };

  // Compute result ids (order + filter)
  useEffect(() => {
    let ids;

    if (query.trim()) {
      // minisearch returns relevance‑ranked results in order
      ids = mini.search(query.trim()).map(r => r.id);
      if (selected.size) {
        ids = ids.filter(id => {
          const item = items.find(i => i.id === id);
          const kws = new Set(item?.keywords || []);
          for (const t of selected) if (!kws.has(t)) return false;
          return true;
        });
      }
      // Only override order if sort != relevance
      if (sort !== "relevance") {
        const m = new Map(items.map(i => [i.id, i]));
        ids.sort((A, B) => {
          const a = m.get(A), b = m.get(B);
          if (sort === "newest")     return new Date(b.date) - new Date(a.date);
          if (sort === "citations")  return (b.impact?.citations || 0) - (a.impact?.citations || 0);
          if (sort === "stars")      return (b.impact?.github_stars || 0) - (a.impact?.github_stars || 0);
          return 0;
        });
      }
    } else {
      // no query → start with all items in chosen sort
      ids = items.map(i => i.id);
      const m = new Map(items.map(i => [i.id, i]));
      ids.sort((A, B) => {
        const a = m.get(A), b = m.get(B);
        if (sort === "newest" || sort === "relevance") return new Date(b.date) - new Date(a.date);
        if (sort === "citations")  return (b.impact?.citations || 0) - (a.impact?.citations || 0);
        if (sort === "stars")      return (b.impact?.github_stars || 0) - (a.impact?.github_stars || 0);
        return 0;
      });
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

  // Apply visibility + DOM reordering to SSR cards
  useEffect(() => {
    let container = document.querySelector(listSelector);
    if (!container) {
        // Fallbacks to avoid a hard failure if the attribute isn't present
        container =
        document.querySelector('.projects-grid[data-list="projects"]') ||
        document.querySelector('.projects-grid'); // last resort (be careful if multiple grids exist)
    }
    if (!container) return;

    const cards = Array.from(container.querySelectorAll('[data-slug]'));
    const byId = new Map(cards.map(el => [el.getAttribute('data-slug'), el]));

    // Show/hide
    const show = new Set(visibleIds);
    cards.forEach(el => {
        const id = el.getAttribute('data-slug');
        el.hidden = !show.has(id);
    });

    // Reorder DOM to match ids
    visibleIds.forEach(id => {
        const el = byId.get(id);
        if (el) container.appendChild(el);
    });

    // Empty + counter
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
        <div className="toolbar">
          <input
            type="search"
            placeholder="Search title, summary…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search projects"
          />

          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort projects">
            <option value="newest">Newest</option>
            <option value="relevance">Relevance</option>
            <option value="citations">Most cited</option>
            <option value="stars">Most GitHub stars</option>
          </select>

          <button className="btn btn--ghost small" onClick={clearFilters} type="button">Clear</button>

          <div className="chips" style={{ marginTop: 8 }}>
            {allTags.map(tag => {
              const active = selected.has(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  className="tag"
                  aria-pressed={active ? "true" : "false"}
                  onClick={() => toggleTag(tag)}
                  title={active ? `Remove ${tag}` : `Filter by ${tag}`}
                >
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
