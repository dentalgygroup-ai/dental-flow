export const SUBSCRIPTION_PLANS = {
  monthly: {
    label: 'Mensual',
    priceLabel: '14,95€',
    periodLabel: '/mes',
  },
  annual: {
    label: 'Anual',
    priceLabel: '124,50€',
    periodLabel: '/año',
  }
};

export const MAX_USERS_DEFAULT = 4;

export function getPlanLabel(planId) {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) return 'Plan desconocido';
  return `${plan.label} — ${plan.priceLabel}${plan.periodLabel}`;
}