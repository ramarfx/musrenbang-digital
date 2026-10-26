import { z } from 'zod';
import { PROFILE_ROLES } from '../constants';
import { timestampSchema, uuidSchema } from './common';

export const profileRoleSchema = z.enum(PROFILE_ROLES);

export const profileSchema = z.object({
  id: uuidSchema,
  email: z.string().email(),
  nama: z.string(),
  peran: profileRoleSchema,
  dibuat_pada: timestampSchema,
});

export type Profile = z.infer<typeof profileSchema>;
