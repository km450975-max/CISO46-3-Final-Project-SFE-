import { z } from 'zod';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');

const password = z
  .string()
  .min(8, 'Use at least 8 characters')
  .max(72, 'Use at most 72 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/[0-9]/, 'Include at least one number');

const emptyQuery = z.object({}).strip();

export const registerSchema = z.object({
  body: z.object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, or underscores')
      .transform((value) => value.toLowerCase()),
    email: z.string().trim().email('Enter a valid email address').transform((value) => value.toLowerCase()),
    password,
  }),
  query: emptyQuery,
  params: z.object({}).strip(),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().trim().email('Enter a valid email address').transform((value) => value.toLowerCase()),
    password: z.string().min(1, 'Enter your password'),
  }),
  query: emptyQuery,
  params: z.object({}).strip(),
});

export const startGameSchema = z.object({
  body: z.object({
    difficulty: z.enum(['easy', 'medium', 'hard']),
    mode: z.enum(['ranked', 'practice']).default('ranked'),
    restart: z.boolean().optional().default(false),
  }),
  query: emptyQuery,
  params: z.object({}).strip(),
});

export const sessionParamSchema = z.object({
  body: z.object({}).strip(),
  query: emptyQuery,
  params: z.object({ id: objectId }),
});

export const submitSchema = z.object({
  body: z
    .object({
      answer: z.union([z.string(), z.number()]).optional(),
      expired: z.boolean().optional().default(false),
    })
    .superRefine((body, ctx) => {
      if (body.expired) return;
      const text = body.answer === undefined || body.answer === null ? '' : String(body.answer).trim();
      if (!/^-?\d+$/.test(text)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['answer'], message: 'Enter an integer' });
      }
    }),
  query: emptyQuery,
  params: z.object({ id: objectId }),
});

export const puzzleParamSchema = z.object({
  body: z.object({}).strip(),
  query: emptyQuery,
  params: z.object({ id: objectId }),
});

export const pageSchema = z.object({
  body: z.object({}).strip(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  }),
  params: z.object({}).strip(),
});

export const profileSchema = z.object({
  body: z
    .object({
      displayName: z.string().trim().min(2, 'Use at least 2 characters').max(40).optional(),
      avatarKey: z.enum(['banana', 'ocean', 'forest', 'sunset', 'grape', 'slate']).optional(),
      theme: z.enum(['light', 'dark']).optional(),
    })
    .refine((body) => Object.keys(body).length > 0, { message: 'Provide a profile change' }),
  query: emptyQuery,
  params: z.object({}).strip(),
});

export const passwordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: password,
  }),
  query: emptyQuery,
  params: z.object({}).strip(),
});

export const adminUserSchema = z.object({
  body: z
    .object({
      role: z.enum(['student', 'admin']).optional(),
      accountStatus: z.enum(['active', 'suspended']).optional(),
    })
    .refine((body) => body.role || body.accountStatus, { message: 'Provide a role or account status' }),
  query: emptyQuery,
  params: z.object({ id: objectId }),
});
