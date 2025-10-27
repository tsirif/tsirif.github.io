import { defineCollection, z } from "astro:content";

const authorSchema = z.union([
  z.string(),
  z.object({
    name: z.string(),
    url: z.string().url().optional(),
    highlight: z.boolean().optional(),
    equal: z.boolean().optional(),
  }),
]);

const projects = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    venue: z.string().optional(),
    authors: z.array(authorSchema).default([]),
    status: z.enum(["in-progress","preprint","submitted","accepted","published","archived"]).optional(),
    tldr: z.string().optional(),
    motivation: z.string().optional(),
    abstract: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    impact: z.object({
      citations: z.number().optional(),
      github_stars: z.number().optional(),
      downloads: z.number().optional(),
      mentions: z.number().optional(),
    }).partial().default({}),
    links: z.object({
      code: z.string().url().optional(),
      demo: z.string().url().optional(),
      paper: z.string().url().optional(),
      website: z.string().url().optional(),
      explainer: z.string().optional(),
      x: z.string().url().optional(),
    }).partial().default({}),
    images: z.object({
      teaser: z.string().optional(),
      alt: z.string().optional(),
    }).partial().default({}),
    bibtex: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const writing = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string().optional(),
    keywords: z.array(z.string()).default([]),
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    featured: z.boolean().default(false),
  }),
});

const news = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    body: z.string(),
  }),
});

export const collections = { projects, writing, news };
