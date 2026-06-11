import { useMemo } from "react";
import { paymentMethodsService } from "@/services/paymentMethods";
import { queryKeys } from "@/lib/queryClient";
import type { PaymentMethod } from "@/types";
import { useNamedEntities } from "./useNamedEntities";

export function usePaymentMethods() {
  return useNamedEntities<PaymentMethod>(
    paymentMethodsService,
    queryKeys.paymentMethods,
  );
}

export function usePaymentMethodMap() {
  const { all } = usePaymentMethods();
  return useMemo(() => new Map(all.map((p) => [p.id, p])), [all]);
}
