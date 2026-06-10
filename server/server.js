const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const stripe = require('stripe');
const nodemailer = require('nodemailer');
const path = require('path');

// Load environment variables from the root .env file
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Stripe
const stripeClient = stripe(process.env.VITE_STRIPE_SECRET_KEY);

// Initialize Nodemailer transporter with Zoho SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// Route 1: Create Stripe Payment Intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount, currency } = req.body;
    
    // Create a PaymentIntent with the order amount and currency
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: amount || 1000, // Default to $10.00 if not provided
      currency: currency || 'usd',
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route 2: Send Email via Zoho SMTP
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Missing required fields: to, subject' });
    }

    const mailOptions = {
      from: `"${process.env.SMTP_SENDER_NAME}" <${process.env.SMTP_SENDER_EMAIL}>`,
      to,
      subject,
      text,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route 3: Send Signing Emails to Signatories
app.post('/api/send-signing-email', async (req, res) => {
  try {
    const { signatories, documentId, documentTitle, ownerEmail } = req.body;

    if (!signatories || signatories.length === 0) {
      return res.status(400).json({ error: 'Missing signatories' });
    }

    const FRONTEND_URL = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';

    // Send emails in parallel
    const promises = signatories.map((sig) => {
      const signUrl = `${FRONTEND_URL}/document/${documentId}/view`;
      
      const mailOptions = {
        from: `"${process.env.SMTP_SENDER_NAME}" <${process.env.SMTP_SENDER_EMAIL}>`,
        to: sig.email,
        subject: `Signature Request: ${documentTitle}`,
        text: `Hello ${sig.name},\n\n${ownerEmail} has requested your signature on the document "${documentTitle}".\n\nPlease review and sign the document here: ${signUrl}\n\nThank you,\nEZSignNow Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background-color: #22c55e; padding: 20px; text-align: center;">
              <h2 style="color: white; margin: 0;">EZSignNow</h2>
            </div>
            <div style="padding: 30px; background-color: #ffffff;">
              <h3 style="color: #1e293b; margin-top: 0;">Signature Request</h3>
              <p style="color: #475569; font-size: 16px; line-height: 1.5;">Hello <strong>${sig.name}</strong>,</p>
              <p style="color: #475569; font-size: 16px; line-height: 1.5;"><strong>${ownerEmail}</strong> has requested your signature on the document <strong>"${documentTitle}"</strong>.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${signUrl}" style="background-color: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Review & Sign Document</a>
              </div>
              <p style="color: #94a3b8; font-size: 14px; text-align: center; margin-bottom: 0;">Powered by EZSignNow</p>
            </div>
          </div>
        `,
      };

      return transporter.sendMail(mailOptions);
    });

    await Promise.all(promises);

    res.json({ success: true, message: 'Signing emails dispatched' });
  } catch (error) {
    console.error('Error dispatching signing emails:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check route
app.get('/health', (req, res) => {
  res.json({ status: 'OK' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
