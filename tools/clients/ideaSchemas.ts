import { z } from "zod";

export const IdeaInboxItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  status: z.string(),
  created_at: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export const PRISchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  status: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
  metadata: z.record(z.unknown()).optional()
});

export const ListInboxResponseSchema = z.object({
  items: z.array(IdeaInboxItemSchema)
});

export const HarvestResponseSchema = z.object({
  pri_id: z.string(),
  status: z.string()
});

export const HarvestBatchResponseSchema = z.object({
  harvested: z.array(z.string()),
  failed: z.array(z.string())
});

export const ListPRIsResponseSchema = z.object({
  pris: z.array(PRISchema)
});

export const UpdateStatusResponseSchema = z.object({
  id: z.string(),
  status: z.string()
});

export const ConfigResponseSchema = z.object({
  key: z.string(),
  value: z.unknown()
});

export const DailyDigestResponseSchema = z.object({
  digest: z.string(),
  inbox_count: z.number(),
  pri_count: z.number()
});

export type IdeaInboxItem = z.infer<typeof IdeaInboxItemSchema>;
export type PRI = z.infer<typeof PRISchema>;
export type ListInboxResponse = z.infer<typeof ListInboxResponseSchema>;
export type HarvestResponse = z.infer<typeof HarvestResponseSchema>;
export type HarvestBatchResponse = z.infer<typeof HarvestBatchResponseSchema>;
export type ListPRIsResponse = z.infer<typeof ListPRIsResponseSchema>;
export type UpdateStatusResponse = z.infer<typeof UpdateStatusResponseSchema>;
export type ConfigResponse = z.infer<typeof ConfigResponseSchema>;
export type DailyDigestResponse = z.infer<typeof DailyDigestResponseSchema>;
