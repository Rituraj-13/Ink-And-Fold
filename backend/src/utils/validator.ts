import z from "zod";

export const userSchema = z.object({
  name: z.string().optional(),
  email: z.email(),
  password: z.string().min(6),
});

export const postsSchema = z.object({
  title: z.string(),
  content: z.string(),
  status: z.enum(["DRAFT", "UNDER_REVIEW", "PUBLISHED"]).optional(),
  coverImage: z.string().url().optional().nullable(),
});
