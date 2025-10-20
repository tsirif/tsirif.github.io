import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET({ site }) {
  // fetch posts from your "writing" Content Collection
  const posts = await getCollection('writing');

  // newest first
  posts.sort((a, b) => new Date(b.data.date) - new Date(a.data.date));

  // site: absolute origin is required; fall back to GitHub Pages if site is unset
  const origin = (site && site.toString()) || 'https://tsirif.github.io';

  return rss({
    title: 'Writing — logotechnologia',
    description: 'Essays, opinions, and explainers by Christos Tsirigotis.',
    site: origin,
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.summary || '',            // keep it short; HTML optional
      link: `/writing/${p.slug}/`,                  // Astro will resolve against `site`
      pubDate: p.data.date,                         // must be a Date
      categories: (p.data.keywords || []).map(String),
    })),
    customData: `
      <language>en</language>
    `.trim(),
  });
}
