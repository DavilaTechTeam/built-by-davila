# Built by Davila V2

This package contains:

- `index.html` — public homepage
- `pricing.html` — public pricing page
- `studio.html` — Back Office / Studio prototype
- `styles.css` — public website styling
- `script.js` — public website navigation
- `studio.css` — Back Office styling
- `studio.js` — Back Office demo logic
- `assets/built-by-davila-logo.png` — new logo

## Back Office prototype features
- Dashboard
- Clients
- Quotes
- Quote builder
- Invoices
- Payments list
- Recurring subscriptions
- Deposit calculation
- Convert quote to invoice/payment request
- Local browser storage for demo records

## Important
This prototype does **not** process real payments yet.

For production:
1. Host the back office on a secure backend (recommended: Azure).
2. Add authentication.
3. Use Stripe Checkout / Payment Links / Payment Intents.
4. Use Stripe Billing for recurring payments.
5. Store business data in PostgreSQL / Azure SQL.
6. Never store raw card data in the application.
7. Connect `app.builtbydavila.com` to the secure app.

GitHub Pages is appropriate for the public website, but not for securely processing payments by itself.
