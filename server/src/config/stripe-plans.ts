export const SUBSCRIPTION_PLANS = {
  monthly: {
    priceId:
      process.env.STRIPE_PRICE_MONTHLY || "price_1SNMrbBOcWVXza8XwLwAkEXt",
    amount: 15,
    period: "month",
    name: "Plano Mensal",
    description: "R$ 15/mês - Cancele quando quiser",
  },
  yearly: {
    priceId:
      process.env.STRIPE_PRICE_YEARLY || "price_1SNMrHBOcWVXza8XbRI8SaTh",
    amount: 140,
    period: "year",
    name: "Plano Anual",
    description: "R$ 140/ano - Economize 20%",
    originalAmount: 180,
  },
  trial: {
    priceId: process.env.STRIPE_PRICE_TRIAL || "price_1SMqB9BOcWVXza8Xb7xIl8mE",
    amount: 1,
    period: "month",
    name: "Teste Premium",
    description: "R$ 1 no primeiro mês",
  },
} as const;

export const DEPOSIT_OPTIONS = [
  { amount: 1, priceId: process.env.STRIPE_DEPOSIT_1 || "price_deposit_1" },
  { amount: 5, priceId: process.env.STRIPE_DEPOSIT_5 || "price_deposit_5" },
  { amount: 10, priceId: process.env.STRIPE_DEPOSIT_10 || "price_deposit_10" },
  { amount: 20, priceId: process.env.STRIPE_DEPOSIT_20 || "price_deposit_20" },
  { amount: 50, priceId: process.env.STRIPE_DEPOSIT_50 || "price_deposit_50" },
  {
    amount: 100,
    priceId: process.env.STRIPE_DEPOSIT_100 || "price_deposit_100",
  },
] as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type DepositOption = (typeof DEPOSIT_OPTIONS)[number];
