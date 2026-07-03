import { z } from 'zod';

// Same shape for signup and signin: a valid email and a password of at least 8 chars.
export const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export type Credentials = z.infer<typeof credentialsSchema>;
