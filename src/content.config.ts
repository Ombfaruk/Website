import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const galleryItem = z.object({
  src: z.string(),
  alt: z.string().default(''),
  caption: z.string().optional(),
});

const quote = z.object({
  text: z.string(),
  by: z.string().default(''),
});

const work = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/work' }),
  schema: z.object({
    title: z.string().default('Untitled'),
    outcome: z.string().default(''),
    client: z.string().default(''),
    role: z.string().default(''),
    timeline: z.string().default(''),
    tags: z.array(z.string()).default([]),
    cover: z.string().default(''),
    coverAlt: z.string().default(''),
    coverType: z.enum(['image', 'video']).default('image'),
    gallery: z.array(galleryItem).default([]),
    draft: z.boolean().default(false),
    order: z.number().default(0),
    quotes: z.array(quote).default([]),
  }),
});

export const collections = { work };
