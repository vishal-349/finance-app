import { useMemo } from "react";
import { incomeSourcesService } from "@/services/incomeSources";
import { queryKeys } from "@/lib/queryClient";
import type { IncomeSource } from "@/types";
import { useNamedEntities } from "./useNamedEntities";

export function useIncomeSources() {
  return useNamedEntities<IncomeSource>(
    incomeSourcesService,
    queryKeys.incomeSources,
  );
}

export function useIncomeSourceMap() {
  const { all } = useIncomeSources();
  return useMemo(() => new Map(all.map((s) => [s.id, s])), [all]);
}
