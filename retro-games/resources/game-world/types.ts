import { z } from "zod";

export const propSchema = z.object({
  observation: z.string(),
  location: z.object({ num: z.number(), name: z.string() }).nullable(),
  objects: z.array(z.object({ num: z.number(), name: z.string(), parent: z.number() })),
  inventory: z.array(z.object({ num: z.number(), name: z.string() })),
  validActions: z.array(z.string()),
  score: z.number(),
  moves: z.number(),
  maxScore: z.number().optional(),
  reward: z.number().optional(),
  done: z.boolean(),
});

export type GameWorldProps = z.infer<typeof propSchema>;
