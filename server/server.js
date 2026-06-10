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
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Top Bar -->
            <div style="background-color: #f1f5f9; padding: 12px; text-align: center; color: #0f172a; font-size: 13px; font-weight: 500;">
              EZSignNow Document Services
            </div>
            
            <!-- Logo Section -->
            <div style="text-align: center; padding: 30px 0;">
              <h1 style="color: #1e0098; font-size: 32px; margin: 0; font-weight: 800; letter-spacing: -1px;">
                <span style="color: #22c55e;">ez</span>signnow
              </h1>
              <p style="color: #64748b; font-size: 13px; margin: 5px 0 0 0;">Secure Document Portal</p>
            </div>

            <!-- Main Content Area -->
            <div style="background-color: #f8fafc; padding: 40px;">
              <p style="color: #0f172a; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5;">
                Hello <strong>${sig.name}</strong>,
              </p>
              <p style="color: #0f172a; font-size: 16px; margin: 0 0 20px 0; line-height: 1.5;">
                <strong>${ownerEmail}</strong> has requested your signature on the document <strong>"${documentTitle}"</strong>. Please review and sign it below.
              </p>
              
              <div style="margin: 30px 0;">
                <a href="${signUrl}" style="background-color: #1e0098; color: #ffffff; padding: 14px 32px; border-radius: 9999px; text-decoration: none; font-weight: 600; display: inline-block; font-size: 15px;">View Document</a>
              </div>
              
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
              
              <!-- Warning Section -->
              <div>
                <h4 style="margin: 0 0 8px 0; font-size: 16px; color: #0f172a; font-weight: 700;">Do Not Share This Email</h4>
                <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.5;">To ensure the security of your data, do not share the links or forward this email to others.</p>
              </div>
            </div>

            <!-- Footer Section -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 25px 40px;">
              <tr>
                <td style="font-size: 13px; color: #0f172a; line-height: 1.5;">
                  Processed by EZSignNow on behalf of ${ownerEmail}
                </td>
                <td align="right" width="100">
                  <a href="mailto:${ownerEmail}" style="border: 1px solid #1e0098; color: #1e0098; padding: 8px 24px; border-radius: 9999px; text-decoration: none; font-size: 13px; font-weight: 600; display: inline-block;">Contact</a>
                </td>
              </tr>
            </table>
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

// Route 4: Send OTP Verification Code
app.post('/api/send-verification-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'Missing email or code' });
    }

    const mailOptions = {
      from: `"EZSignNow Security" <${process.env.SMTP_SENDER_EMAIL}>`,
      to: email,
      subject: `Your EZSignNow Verification Code: ${code}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-top: 0;">Device Verification</h2>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">You recently attempted to log in from an unrecognized device.</p>
          <p style="color: #475569; font-size: 16px; line-height: 1.5;">Your verification code is:</p>
          <div style="background-color: #f1f5f9; padding: 20px; text-align: center; border-radius: 6px; margin: 30px 0;">
            <h1 style="color: #1e0098; font-size: 40px; letter-spacing: 5px; margin: 0;">${code}</h1>
          </div>
          <p style="color: #475569; font-size: 14px;">If you did not request this, please secure your account immediately.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Verification code sent' });
  } catch (error) {
    console.error('Error sending verification code:', error);
    res.status(500).json({ error: error.message });
  }
});

// Route 5: Send Action Notifications (Signed / Completed)
app.post('/api/send-action-email', async (req, res) => {
  try {
    const { emails, documentTitle, actionType, actorName } = req.body;

    if (!emails || emails.length === 0) {
      return res.status(400).json({ error: 'Missing recipients' });
    }

    const title = actionType === 'completed' 
      ? `Completed: ${documentTitle}`
      : `Document Signed by ${actorName}`;

    const heading = actionType === 'completed'
      ? `The document "${documentTitle}" has been fully executed.`
      : `${actorName} has signed the document "${documentTitle}".`;

    const promises = emails.map((email) => {
      const mailOptions = {
        from: `"${process.env.SMTP_SENDER_NAME}" <${process.env.SMTP_SENDER_EMAIL}>`,
        to: email,
        subject: title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
            <!-- Top Bar -->
            <div style="background-color: #f1f5f9; padding: 12px; text-align: center; color: #0f172a; font-size: 13px; font-weight: 500;">
              EZSignNow Document Services
            </div>
            
            <!-- Logo Section -->
            <div style="text-align: center; padding: 30px 0;">
              <h1 style="color: #1e0098; font-size: 32px; margin: 0; font-weight: 800; letter-spacing: -1px;">
                <span style="color: #22c55e;">ez</span>signnow
              </h1>
            </div>

            <!-- Main Content Area -->
            <div style="background-color: #f8fafc; padding: 40px; text-align: center;">
              <div style="display: inline-block; background-color: #22c55e; color: white; width: 48px; height: 48px; border-radius: 24px; line-height: 48px; font-size: 24px; font-weight: bold; margin-bottom: 20px;">✓</div>
              <h2 style="color: #0f172a; margin: 0 0 15px 0;">Update: ${documentTitle}</h2>
              <p style="color: #475569; font-size: 16px; line-height: 1.5; margin: 0;">
                ${heading}
              </p>
            </div>
            
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 25px 40px;">
              <tr>
                <td style="font-size: 13px; color: #0f172a; line-height: 1.5; text-align: center;">
                  Processed securely by EZSignNow
                </td>
              </tr>
            </table>
          </div>
        `,
      };
      return transporter.sendMail(mailOptions);
    });

    await Promise.all(promises);
    res.json({ success: true, message: 'Action emails dispatched' });
  } catch (error) {
    console.error('Error sending action email:', error);
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
