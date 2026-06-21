# EZSignNow

EZSignNow is a robust, secure, and modern digital signature platform built to streamline your document workflows. It offers a premium, enterprise-grade user experience with seamless document preparation, digital signatures, Stripe payment integrations, and action-triggered email notifications.

## Features

- **Document Preparation Wizard:** An intuitive, multi-step wizard to upload PDFs, add recipients, and place signature/text fields seamlessly.
- **Action-Triggered Emails:** Automated email dispatching via Zoho SMTP for document signatures and full completion events.
- **Enterprise UI & Theme:** Professional, clean aesthetics meticulously modeled after the Eversign / Xodo Sign UI, featuring a globally responsive sidebar layout, slate navigation, and premium blue action elements.
- **Device Verification (2FA):** Secure login gate that requires an email-based 6-digit OTP when accessing from unverified devices.
- **Stripe Integration:** Integrated secure deposit/payment gateway right within the document viewing flow.
- **Real-Time Document Status:** Full-width tabular views of document progress, signatory statuses, and certified PDF downloads.

## Technology Stack

- **Frontend:** React, Vite, TypeScript, Tailwind CSS, shadcn-ui, Lucide Icons.
- **Backend/API:** Node.js, Express.js (for proxying and email dispatch).
- **Email Delivery:** Nodemailer integrated with Zoho SMTP.
- **Database / Auth:** Supabase (PostgreSQL, Row Level Security, Authentication).
- **Payments:** Stripe Checkout.

## Getting Started

### Prerequisites

- Node.js & npm installed
- A Supabase project set up
- A Stripe account
- An SMTP provider (e.g., Zoho)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ezsignnow/EZSignNow.git
   cd EZSignNow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and add your keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SMTP_HOST=smtppro.zoho.com
   SMTP_PORT=587
   SMTP_USER=your_smtp_user
   SMTP_PASS=your_smtp_pass
   SMTP_SENDER_NAME=EZSignNow
   SMTP_SENDER_EMAIL=your_smtp_email
   STRIPE_SECRET_KEY=your_stripe_secret_key
   ```

4. **Start the Frontend (Vite):**
   ```bash
   npm run dev
   ```

5. **Start the Backend (Express for emails and Stripe):**
   ```bash
   node server/server.js
   ```

## Deployment

The application is configured to be deployed on modern cloud platforms like **Vercel** or **Netlify**. 

When connected to your GitHub repository, pushing to the `main` branch will automatically trigger a production build (`npm run build`) and deploy your frontend. Ensure you add all environment variables to your deployment provider's settings. 

The Express backend can be hosted on platforms like Render, Heroku, or directly via serverless functions on Vercel.

## License

All rights reserved. EZSignNow.
