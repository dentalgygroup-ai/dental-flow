import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, plan, clinic_id, return_url, cancel_url } = await req.json();

  // Create Stripe Checkout Session for a clinic subscription
  if (action === 'create_checkout') {
    const priceId = plan === 'annual'
      ? Deno.env.get('STRIPE_PRICE_ID_ANNUAL')
      : Deno.env.get('STRIPE_PRICE_ID_MONTHLY');

    // Get or create Stripe customer for the clinic
    const clinics = await base44.entities.Clinic.filter({ id: clinic_id });
    const clinic = clinics[0];
    if (!clinic) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 });

    let customerId = clinic.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: clinic.name,
        metadata: { clinic_id: clinic.id, owner_email: user.email },
      });
      customerId = customer.id;
      await base44.asServiceRole.entities.Clinic.update(clinic.id, { stripe_customer_id: customerId });
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { clinic_id: clinic.id },
      },
      success_url: return_url + '?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancel_url,
      locale: 'es',
    });

    return Response.json({ url: session.url });
  }

  // Get subscription status for a clinic
  if (action === 'status') {
    const clinics = await base44.entities.Clinic.filter({ id: clinic_id });
    const clinic = clinics[0];
    if (!clinic) return Response.json({ error: 'Clínica no encontrada' }, { status: 404 });

    if (!clinic.stripe_subscription_id) {
      return Response.json({ subscription_status: clinic.subscription_status || 'none' });
    }

    const sub = await stripe.subscriptions.retrieve(clinic.stripe_subscription_id);
    let status = 'none';
    if (sub.status === 'active') status = 'active';
    else if (sub.status === 'trialing') status = 'trialing';
    else if (sub.status === 'past_due') status = 'past_due';
    else if (sub.status === 'canceled') status = 'cancelled';

    await base44.asServiceRole.entities.Clinic.update(clinic.id, {
      subscription_status: status,
      current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      trial_end_date: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
    });

    return Response.json({
      subscription_status: status,
      current_period_end: sub.current_period_end,
      trial_end: sub.trial_end,
    });
  }

  // Cancel subscription
  if (action === 'cancel') {
    const clinics = await base44.entities.Clinic.filter({ id: clinic_id });
    const clinic = clinics[0];
    if (!clinic?.stripe_subscription_id) return Response.json({ error: 'No hay suscripción activa' }, { status: 400 });

    await stripe.subscriptions.update(clinic.stripe_subscription_id, { cancel_at_period_end: true });
    return Response.json({ success: true });
  }

  // Create billing portal session
  if (action === 'portal') {
    const clinics = await base44.entities.Clinic.filter({ id: clinic_id });
    const clinic = clinics[0];
    if (!clinic?.stripe_customer_id) return Response.json({ error: 'No hay cliente en Stripe' }, { status: 400 });

    const session = await stripe.billingPortal.sessions.create({
      customer: clinic.stripe_customer_id,
      return_url: return_url,
    });

    return Response.json({ url: session.url });
  }

  return Response.json({ error: 'Acción no válida' }, { status: 400 });
});