export const SUBSCRIPTION_PLANS = {
  monthly: {
    label: 'Mensual',
    priceLabel: '49€',
    periodLabel: '/mes',
  },
  annual: {
    label: 'Anual',
    priceLabel: '490€',
    periodLabel: '/año',
  }
};

export const MAX_USERS_DEFAULT = 4;

export function getPlanLabel(planId) {
  const plan = SUBSCRIPTION_PLANS[planId];
  if (!plan) return 'Plan desconocido';
  return `${plan.label} — ${plan.priceLabel}${plan.periodLabel}`;
}