import { z } from 'zod';

export const notificationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
  // Query strings carry "true"/"false". Kept as a literal union rather than a
  // .transform() to boolean, because validateData<T> requires the schema's
  // input and output types to match; the controller does the conversion.
  unreadOnly: z.enum(['true', 'false']).default('false'),
});

export type NotificationQueryInput = z.infer<typeof notificationQuerySchema>;

/** What the service takes, once the query string has been converted. */
export interface NotificationListOptions {
  limit: number;
  cursor?: string;
  unreadOnly: boolean;
}
