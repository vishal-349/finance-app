import type { PaymentMethod } from "@/types";
import { COLLECTIONS } from "./firestore";
import { createNamedService } from "./namedCollection";

export const paymentMethodsService = createNamedService<PaymentMethod>(
  COLLECTIONS.paymentMethods,
);
