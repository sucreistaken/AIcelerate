import { z } from "zod";

export const connectionDeepDiveSchema = z.object({
  concept: z.string().min(1, "concept is required"),
  lessonTitles: z.array(z.string()).default([]),
  relatedConcepts: z.array(z.string()).default([]),
});
