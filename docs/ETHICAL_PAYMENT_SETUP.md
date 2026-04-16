# 🌱 Ethical Payment Setup Guide

**You removed Stripe.** Here's how to set up ethical payment processing for
QRBuddy Pro ($49 lifetime).

---

## 🎯 Quick Decision Matrix

| Processor         | Fees       | Best For                      | Pros                                  | Cons                     |
| ----------------- | ---------- | ----------------------------- | ------------------------------------- | ------------------------ |
| **Lemon Squeezy** | ~8%        | Indie SaaS, digital products  | Handles all taxes, merchant of record | Slightly higher fees     |
| **Ko-fi**         | 0-5%       | Creators you already have it! | Very indie-friendly, transparent      | Manual fulfillment       |
| **Gumroad**       | 10%        | Digital products              | Simple, pay-what-you-want support     | Highest fees             |
| **Square** (AU)   | 1.9% + 30¢ | Australian businesses         | Lowest fees, local                    | Clunky for digital goods |

**My recommendation:** Start with **Ko-fi** (you already integrate it!) or
**Lemon Squeezy**.

---

## Option 1: Ko-fi (Easiest Start)

### Why Ko-fi?

- You already have Ko-fi integrated for tips!
- Creator-first, transparent company
- 0% fees if you upgrade to Ko-fi Gold ($6/mo)
- Otherwise 5% fees (still way cheaper than Stripe)
- Very Melbourne indie vibe

### Setup (10 minutes):

1. **Go to ko-fi.com** → Your account
2. **Click "Monetization"** → **"Memberships"**
3. **Create a tier:**
   - Name: `QRBuddy Pro`
   - Price: `$49 USD` (one-time)
   - Description: "Lifetime Pro access for QRBuddy - bulk export, analytics, SVG
     export, no branding"
4. **Get your membership link**: Looks like
   `https://ko-fi.com/yourname/membership`
5. **Add to Deno Deploy env vars:**
   ```bash
   PAYMENT_URL_PRO=https://ko-fi.com/pabloandres/membership
   ```

### How it works:

1. User clicks "Upgrade to Pro" → redirected to your Ko-fi
2. They pay $49 via Ko-fi
3. Ko-fi emails you: "New member!"
4. You manually email them a Pro code: `qrbuddy-pro-abc123`
5. They paste it in QRBuddy → unlocked!

**Automate it (optional):** Use Zapier to auto-send Pro codes when Ko-fi payment
received.

---

## Option 2: Lemon Squeezy (Most Professional)

### Why Lemon Squeezy?

- Built specifically for indie devs who hate Stripe
- They're the "merchant of record" (handle ALL tax compliance for you!)
- Very transparent company, no VC nonsense
- ~8% total fees (5% LS + 3% payment processing)
- Dead simple integration

### Setup (20 minutes):

1. **Sign up at lemonsqueezy.com**
2. **Create a product:**
   - Name: `QRBuddy Pro - Lifetime Access`
   - Type: `Digital Product`
   - Price: `$49 USD` (one-time)
   - Description: Copy from types/pricing.ts features list
3. **Create a checkout link** (not subscription!)
4. **Copy the checkout URL**: Looks like
   `https://yourstore.lemonsqueezy.com/checkout/buy/abc123`
5. **Add to Deno Deploy:**
   ```bash
   PAYMENT_URL_PRO=https://yourstore.lemonsqueezy.com/checkout/buy/abc123
   ```

### How it works:

1. User clicks "Upgrade to Pro" → Lemon Squeezy checkout
2. They pay $49
3. Lemon Squeezy webhook sends you confirmation
4. You email them Pro code
5. Done!

**Pro move:** Set up Lemon Squeezy webhook to auto-send Pro codes (tutorial
below).

---

## Option 3: Gumroad (Super Simple)

### Why Gumroad?

- Very popular with creators
- 10% fees (high, but handles everything)
- Supports pay-what-you-want pricing!
- Can test PWYW vs fixed $49

### Setup (5 minutes):

1. **Go to gumroad.com** → Create product
2. **Product details:**
   - Name: `QRBuddy Pro - Lifetime`
   - Price: `$49` (or enable pay-what-you-want with $49 suggested)
3. **Copy product link**: `https://yourname.gumroad.com/l/qrbuddy-pro`
4. **Add to Deno Deploy:**
   ```bash
   PAYMENT_URL_PRO=https://pabloandres.gumroad.com/l/qrbuddy-pro
   ```

### Pay-What-You-Want Experiment:

Set minimum $20, suggested $49, let people pay what feels right. Studies show
people often pay MORE with PWYW!

---

## Option 4: Square (Australian Local)

### Why Square?

- You're in Melbourne! Local processor
- Lowest fees: 1.9% + 30¢
- Australian company, Australian support

### Why NOT Square?

- More suited to physical goods / in-person payments
- Clunky for digital products
- Subscriptions are their strength, not one-time digital sales

**Verdict:** Use Ko-fi or Lemon Squeezy instead unless you have a strong
preference for Square.

---

## 🔧 Pro Code System (No OAuth Needed!)

### How users activate Pro:

**Manual method (works with all payment processors):**

1. User pays via your chosen processor
2. You email them: "Thanks! Your Pro code is: `qrbuddy-pro-6d8a9f2b`"
3. They go to QRBuddy → click "Enter Pro Code"
4. Paste code → unlocked!
5. Code saved in localStorage (persists across sessions)

### Generating Pro codes:

```bash
# Simple random code
crypto.randomUUID() → "550e8400-e29b-41d4-a716-446655440000"

# Or shorter code
crypto.randomUUID().split('-')[0] → "550e8400"
```

### Storing Pro codes in Supabase:

Use the migration you already have:
`supabase/migrations/20251111_pro_subscriptions.sql`

Just update it to work with any payment processor (not just Stripe):

```sql
CREATE TABLE pro_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  pro_code TEXT NOT NULL UNIQUE,
  payment_processor TEXT, -- 'kofi', 'lemonsqueezy', 'gumroad', etc.
  payment_id TEXT, -- Transaction ID from processor
  activated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🤖 Auto-Fulfillment (Optional)

### With Lemon Squeezy:

1. Set up webhook: `https://qrbuddy.app/functions/v1/lemon-squeezy-webhook`
2. On payment → generate Pro code → email customer automatically
3. Store code in Supabase
4. Fully automated!

### With Ko-fi:

1. Use Zapier: Ko-fi payment → Send email with Pro code
2. Or use Ko-fi webhooks (if you upgrade to Ko-fi Gold)

### With Gumroad:

1. Use Gumroad's built-in "License Key" feature!
2. Auto-generate unique codes for each purchase
3. Customer gets code immediately after payment

---

## 💰 Pricing Experiments to Try

### Fixed $49 (Current)

- Simple, clear value
- Most sustainable for you

### Pay-What-You-Want ($20-99)

- Set minimum $20, suggested $49
- Builds incredible goodwill
- Some will overpay to support you
- **Try this on Gumroad!**

### Tiered Pricing

- **Supporter:** $29 (Pro features + good vibes)
- **Pro:** $49 (Pro features)
- **Generous:** $99 (Pro features + eternal gratitude)

People will self-select based on how much they value your work!

---

## 📊 Tracking Sales (PostHog)

Your analytics already track:

- `upgrade_clicked` (with "lifetime" billing)
- `upgrade_completed` (after payment)
- `upgrade_cancelled` (if they bail)

This works with ANY payment processor! Just redirect back to:

- Success: `https://qrbuddy.app/?upgrade=success`
- Cancel: `https://qrbuddy.app/?upgrade=cancelled`

---

## 🚀 Recommended Setup (Today)

**Start simple:**

1. Use **Ko-fi** (you already have it!)
2. Manual Pro code fulfillment (email them yourself)
3. See if people actually want Pro
4. Once you have 10-20 sales → automate with Lemon Squeezy

**Total time:** 10 minutes **Total cost:** $0 (or $6/mo for Ko-fi Gold to remove
fees)

---

## 🎯 My Honest Recommendation

**For Melbourne indie dev vibe:** Use **Ko-fi**.

- You already integrate it
- 0-5% fees (vs 8-10% for others)
- Very transparent, creator-first
- Manual fulfillment at first (emails are personal anyway!)
- Upgrade to Ko-fi Gold ($6/mo) → 0% fees!

**ROI math:**

- Sell 10 Pro licenses at $49 = $490
- Ko-fi fees (5%) = $24.50
- Your profit = $465.50

**With Ko-fi Gold:**

- Ko-fi Gold cost: $6/mo
- Ko-fi fees: 0%
- Your profit: $490 - $6 = $484

Break-even after 2 sales. Easy.

---

## ✅ Next Steps

1. **Choose a payment processor** (I recommend Ko-fi to start)
2. **Set up product/membership** (10 mins)
3. **Add env var to Deno Deploy:**
   ```bash
   PAYMENT_URL_PRO=https://your-payment-link
   ```
4. **Deploy:** `git push origin main`
5. **Test:** Click "Upgrade to Pro" → make sure it redirects correctly
6. **First sale:** Email them a Pro code manually
7. **Iterate:** Try PWYW, tiered pricing, etc.

---

You're ready to launch! 🚀
