import z from "zod";

export const userSchema = z.object({
  name: z.string().optional(),
  email: z.email(),
  password: z.string().min(6),
});

export const postsSchema = z.object({
  title: z.string(),
  content: z.string(),
  publish: z.boolean().optional(),
  draft: z.boolean().optional(),
  coverImage: z.string().url().optional().nullable(),
});
