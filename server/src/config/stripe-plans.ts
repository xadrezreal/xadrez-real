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
} as const;

export const DEPOSIT_OPTIONS = [
  { amount: 1, priceId: process.env.STRIPE_DEPOSIT_1 || "price_1SNcg0BOcWVXza8XshopeAH0" },
  { amount: 10, priceId: process.env.STRIPE_DEPOSIT_10 || "price_1SO2k9BOcWVXza8XerIqIiNW" },
  { amount: 20, priceId: process.env.STRIPE_DEPOSIT_20 || "price_1SO2kzBOcWVXza8XGZbtrKj3" },
  { amount: 50, priceId: process.env.STRIPE_DEPOSIT_50 || "price_1SO2lBBOcWVXza8XKEKKHLuu" },
  { amount: 100, priceId: process.env.STRIPE_DEPOSIT_100 || "price_1SO2lIBOcWVXza8XpANjmt2K" },
  { amount: 200, priceId: process.env.STRIPE_DEPOSIT_200 || "price_1SO2lQBOcWVXza8X4i7a2QWP" },
] as const;

export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type DepositOption = (typeof DEPOSIT_OPTIONS)[number];
