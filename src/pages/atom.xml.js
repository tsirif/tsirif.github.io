import { getCollection } from 'astro:content';

export async function GET({ site }) {
  const [projects, posts] = await Promise.all([
    getCollection('projects'),
    getCollection('writing'),
  ]);

  // const origin = (site && site.toString()) || 'https://tsirif.github.io';
  const origin = (site && site.toString()) || 'https://logotechnologia.com';

  const esc = (s = '') =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

  const all = [
    ...projects.map((p) => ({
      type: 'project',
      title: p.data.title,
      summary: p.data.tldr || p.data.abstract || '',
      date: new Date(p.data.date),
      url: `${origin}/projects/${p.slug}/`,
      authors: (p.data.authors || []).map(String),
      keywords: (p.data.keywords || []).map(String),
    })),
    ...posts.map((p) => ({
      type: 'writing',
      title: p.data.title,
      summary: p.data.summary || '',
      date: new Date(p.data.date),
      url: `${origin}/writing/${p.slug}/`,
      authors: ['Christos Tsirigotis'], // default site author
      keywords: (p.data.keywords || []).map(String),
    })),
  ].sort((a, b) => b.date - a.date);

  const updatedISO = new Date(all[0]?.date || Date.now()).toISOString();
  const selfUrl = `${origin}/atom.xml`;

  const entries = all
    .map((e) => {
      const cats =
        e.keywords.map((k) => `<category term="${esc(k)}" />`).join('') +
        `<category term="type:${esc(e.type)}" />`;
      const authors =
        (e.authors && e.authors.length
          ? e.authors.map((n) => `<author><name>${esc(n)}</name></author>`).join('')
          : `<author><name>Christos Tsirigotis</name></author>`);

      return `
        <entry>
          <title>${esc(e.title)}</title>
          <id>${e.url}</id>
          <link href="${e.url}" rel="alternate" />
          <updated>${e.date.toISOString()}</updated>
          <published>${e.date.toISOString()}</published>
          <summary>${esc(e.summary)}</summary>
          ${authors}
          ${cats}
        </entry>
      `;
    })
    .join('');

  const xml = `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>logotechnologia</title>
  <id>${origin}/</id>
  <updated>${updatedISO}</updated>
  <link href="${selfUrl}" rel="self" />
  <link href="${origin}/" rel="alternate" />
  <author><name>Christos Tsirigotis</name></author>
  ${entries}
</feed>`;

  return new Response(xml, {
    headers: { 'Content-Type': 'application/atom+xml; charset=utf-8' },
  });
}
