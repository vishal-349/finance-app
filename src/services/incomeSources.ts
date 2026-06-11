import type { IncomeSource } from "@/types";
import { COLLECTIONS } from "./firestore";
import { createNamedService } from "./namedCollection";

export const incomeSourcesService = createNamedService<IncomeSource>(
  COLLECTIONS.incomeSources,
);
