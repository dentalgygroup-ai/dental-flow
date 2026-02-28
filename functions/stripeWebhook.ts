import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    return Response.json({ error: `Webhook signature failed: ${err.message}` }, { status: 400 });
  }

  const base44 = createClientFromRequest(req);

  const subscription = event.data.object;
  const customerId = subscription.customer;
  const subStatus = subscription.status;

  // Map Stripe status to our internal status
  let status = 'expired';
  if (subStatus === 'active') status = 'active';
  else if (subStatus === 'trialing') status = 'trialing';
  else if (subStatus === 'canceled' || subStatus === 'cancelled') status = 'cancelled';
  else if (subStatus === 'past_due' || subStatus === 'unpaid') status = 'expired';

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    // Find user by stripe_customer_id
    const users = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: customerId });
    if (users && users.length > 0) {
      const user = users[0];
      const plan = subscription.items?.data?.[0]?.price?.id === Deno.env.get('STRIPE_PRICE_ID_ANNUAL') ? 'annual' : 'monthly';
      const trialEnd = subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null;
      const currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000).toISOString() : null;

      await base44.asServiceRole.entities.User.update(user.id, {
        subscription_status: status,
        subscription_plan: plan,
        trial_end_date: trialEnd,
        subscription_end_date: currentPeriodEnd,
        stripe_subscription_id: subscription.id,
      });
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const users = await base44.asServiceRole.entities.User.filter({ stripe_customer_id: invoice.customer });
    if (users && users.length > 0) {
      await base44.asServiceRole.entities.User.update(users[0].id, { subscription_status: 'expired' });
    }
  }

  return Response.json({ received: true });
});