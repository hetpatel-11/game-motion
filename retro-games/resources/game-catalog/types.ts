import { z } from "zod";

export const propSchema = z.object({
  games: z.array(z.string()),
});

export type GameCatalogProps = z.infer<typeof propSchema>;
