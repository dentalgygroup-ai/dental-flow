import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const PAYPAL_BASE = 'https://api-m.paypal.com';

async function getPayPalAccessToken() {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  return data.access_token;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { action, plan, return_url, cancel_url, subscription_id } = await req.json();

  const accessToken = await getPayPalAccessToken();

  // Create subscription
  if (action === 'create') {
    const planId = plan === 'annual'
      ? Deno.env.get('PAYPAL_PLAN_ID_ANNUAL')
      : Deno.env.get('PAYPAL_PLAN_ID_MONTHLY');

    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        plan_id: planId,
        subscriber: {
          email_address: user.email,
          name: {
            given_name: user.full_name?.split(' ')[0] || '',
            surname: user.full_name?.split(' ').slice(1).join(' ') || '',
          },
        },
        application_context: {
          brand_name: 'Dental Flow',
          locale: 'es-ES',
          shipping_preference: 'NO_SHIPPING',
          user_action: 'SUBSCRIBE_NOW',
          return_url: return_url || 'https://app.base44.com',
          cancel_url: cancel_url || 'https://app.base44.com',
        },
      }),
    });

    const subscription = await res.json();

    if (subscription.id) {
      // Save subscription ID and pending status
      await base44.auth.updateMe({
        paypal_subscription_id: subscription.id,
        subscription_status: 'pending',
        subscription_plan: plan,
      });

      const approvalLink = subscription.links?.find(l => l.rel === 'approve')?.href;
      return Response.json({ subscription_id: subscription.id, approval_url: approvalLink });
    }

    return Response.json({ error: 'Error creating subscription', details: subscription }, { status: 400 });
  }

  // Get subscription status
  if (action === 'status') {
    const subId = subscription_id || user.paypal_subscription_id;
    if (!subId) {
      return Response.json({ subscription_status: user.subscription_status || null });
    }

    const res = await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    const sub = await res.json();

    // Sync status to user
    let status = 'expired';
    if (sub.status === 'ACTIVE') status = 'active';
    else if (sub.status === 'APPROVAL_PENDING' || sub.status === 'APPROVED') status = 'trialing';
    else if (sub.status === 'CANCELLED' || sub.status === 'SUSPENDED') status = 'cancelled';
    else if (sub.status === 'EXPIRED') status = 'expired';

    const trialEnd = sub.billing_info?.last_failed_payment?.time || null;
    const nextBilling = sub.billing_info?.next_billing_time || null;

    await base44.auth.updateMe({
      subscription_status: status,
      trial_end_date: trialEnd,
      subscription_end_date: nextBilling,
    });

    return Response.json({ subscription_status: status, paypal_status: sub.status, next_billing: nextBilling, trial_end: trialEnd });
  }

  // Cancel subscription
  if (action === 'cancel') {
    const subId = user.paypal_subscription_id;
    if (!subId) return Response.json({ error: 'No subscription found' }, { status: 400 });

    await fetch(`${PAYPAL_BASE}/v1/billing/subscriptions/${subId}/cancel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'Cancelled by user' }),
    });

    await base44.auth.updateMe({ subscription_status: 'cancelled' });
    return Response.json({ success: true });
  }

  return Response.json({ error: 'Invalid action' }, { status: 400 });
});