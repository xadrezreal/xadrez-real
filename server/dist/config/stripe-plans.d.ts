export declare const SUBSCRIPTION_PLANS: {
    readonly monthly: {
        readonly priceId: string;
        readonly amount: 15;
        readonly period: "month";
        readonly name: "Plano Mensal";
        readonly description: "R$ 15/mês - Cancele quando quiser";
    };
    readonly yearly: {
        readonly priceId: string;
        readonly amount: 140;
        readonly period: "year";
        readonly name: "Plano Anual";
        readonly description: "R$ 140/ano - Economize 20%";
        readonly originalAmount: 180;
    };
    readonly trial: {
        readonly priceId: string;
        readonly amount: 1;
        readonly period: "month";
        readonly name: "Teste Premium";
        readonly description: "R$ 1 no primeiro mês";
    };
};
export declare const DEPOSIT_OPTIONS: readonly [{
    readonly amount: 1;
    readonly priceId: string;
}, {
    readonly amount: 10;
    readonly priceId: string;
}, {
    readonly amount: 20;
    readonly priceId: string;
}, {
    readonly amount: 50;
    readonly priceId: string;
}, {
    readonly amount: 100;
    readonly priceId: string;
}, {
    readonly amount: 200;
    readonly priceId: string;
}];
export type SubscriptionPlanId = keyof typeof SUBSCRIPTION_PLANS;
export type DepositOption = (typeof DEPOSIT_OPTIONS)[number];
//# sourceMappingURL=stripe-plans.d.ts.map