import { useEffect, useMemo, useState } from "react";
import MiniSearch from "minisearch";

/**
 * props.items = [{ id, title, tldr, abstract, keywords: [lowercase], date, impact:{citations,github_stars} }]
 */
export default function ProjectsFilter({ items }) {
  // Build MiniSearch index once
  const mini = useMemo(() => {
    const ms = new MiniSearch({
      fields: ["title", "tldr", "abstract", "keywords"],
      storeFields: ["id"],
      searchOptions: { prefix: true, fuzzy: 0.2 }
    });
    ms.addAll(items);
    return ms;
  }, [items]);

  // Unique, sorted tag list
  const allTags = useMemo(() => {
    const s = new Set();
    items.forEach(i => (i.keywords || []).forEach(k => s.add(k)));
    return Array.from(s).sort();
  }, [items]);

  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(new Set()); // selected tags (lowercase)
  const [sort, setSort] = useState("newest"); // newest | citations | stars
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

  useEffect(() => {
    // 1) Text matches (or everything)
    let ids;
    if (query.trim()) {
      ids = mini.search(query.trim()).map(r => r.id);
    } else {
      ids = items.map(i => i.id);
    }

    // 2) Tag filter (AND over selected tags)
    if (selected.size) {
      ids = ids.filter(id => {
        const item = items.find(i => i.id === id);
        if (!item) return false;
        const kws = new Set(item.keywords || []);
        for (const t of selected) if (!kws.has(t)) return false;
        return true;
      });
    }

    // 3) Sort
    const sorters = {
      newest: (a, b) => new Date(b.date) - new Date(a.date),
      citations: (a, b) => (b.impact?.citations || 0) - (a.impact?.citations || 0),
      stars: (a, b) => (b.impact?.github_stars || 0) - (a.impact?.github_stars || 0),
    };
    const m = new Map(items.map(i => [i.id, i]));
    ids.sort((A, B) => sorters[sort](m.get(A), m.get(B)));

    setVisibleIds(ids);
  }, [query, selected, sort, items, mini]);

  // Apply visibility to SSR cards
  useEffect(() => {
    const shown = new Set(visibleIds);
    document.querySelectorAll(".projects-grid [data-slug]").forEach((el) => {
      const id = el.getAttribute("data-slug");
      el.hidden = !shown.has(id);
    });
    const counter = document.getElementById("projects-count");
    if (counter) counter.textContent = `${visibleIds.length} of ${items.length}`;
  }, [visibleIds, items.length]);

  return (
    <div className="toolbar" role="region" aria-label="Project filters">
      <input
        type="search"
        placeholder="Search title, TL;DR, abstract…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search projects"
      />

      <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort projects">
        <option value="newest">Newest</option>
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

      <small className="muted" style={{ marginTop: 8 }}>
        Showing <span id="projects-count">{items.length} of {items.length}</span>
      </small>
    </div>
  );
}
