import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

Deno.serve(async (req) => {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return Response.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const subscription = event.data.object;
  const clinicId = subscription.metadata?.clinic_id;

  if (!clinicId) {
    return Response.json({ received: true });
  }

  let status = 'none';
  if (subscription.status === 'active') status = 'active';
  else if (subscription.status === 'trialing') status = 'trialing';
  else if (subscription.status === 'past_due') status = 'past_due';
  else if (subscription.status === 'canceled') status = 'cancelled';

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
    const planNickname = subscription.items?.data?.[0]?.price?.id;
    const priceIdMonthly = Deno.env.get('STRIPE_PRICE_ID_MONTHLY');
    const plan = planNickname === priceIdMonthly ? 'monthly' : 'annual';

    await base44.asServiceRole.entities.Clinic.update(clinicId, {
      stripe_subscription_id: subscription.id,
      subscription_status: status,
      subscription_plan: plan,
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end_date: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    });
  }

  if (event.type === 'customer.subscription.deleted') {
    await base44.asServiceRole.entities.Clinic.update(clinicId, {
      subscription_status: 'cancelled',
      stripe_subscription_id: subscription.id,
    });
  }

  if (event.type === 'invoice.payment_failed') {
    await base44.asServiceRole.entities.Clinic.update(clinicId, {
      subscription_status: 'past_due',
    });
  }

  return Response.json({ received: true });
});