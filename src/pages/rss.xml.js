import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET({ site }) {
  const [projects, posts] = await Promise.all([
    getCollection('projects'),
    getCollection('writing'),
  ]);

  const combined = [
    ...projects.map((p) => ({
      type: 'project',
      title: p.data.title,
      desc: p.data.tldr || p.data.abstract || '',
      date: p.data.date,
      keywords: (p.data.keywords || []).map(String),
      link: `/projects/${p.slug}/`,
    })),
    ...posts.map((p) => ({
      type: 'writing',
      title: p.data.title,
      desc: p.data.summary || '',
      date: p.data.date,
      keywords: (p.data.keywords || []).map(String),
      link: `/writing/${p.slug}/`,
    })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // const origin = (site && site.toString()) || 'https://tsirif.github.io';
  const origin = (site && site.toString()) || 'https://logotechnologia.com';

  return rss({
    title: 'logotechnologia',
    description: 'Essays, projects, and more by Christos Tsirigotis.',
    site: origin,
    items: combined.map((it) => ({
      title: it.title,
      description: it.desc,
      link: it.link,            // Astro builds absolute URLs using `site`
      pubDate: it.date,
      categories: [...it.keywords, `type:${it.type}`],
    })),
    customData: `<language>en</language>`,
  });
}
