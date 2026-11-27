import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import nodemailer from "nodemailer";

let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getSmtpTransporter(env: Record<string, string>) {
  if (cachedTransporter) return cachedTransporter;

  const port = Number(env.SMTP_PORT) || 465;
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST || "smtppro.zoho.com",
    port,
    // Zoho requires SSL (not STARTTLS) on port 465.
    secure: env.SMTP_SECURE === "true" || port === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });
  return cachedTransporter;
}

async function sendEmailViaSmtp(env: Record<string, string>, { to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
  const senderName = env.SMTP_SENDER_NAME || "EZSignNow";
  const senderEmail = env.SMTP_SENDER_EMAIL || "support@ezsignnow.com";

  return getSmtpTransporter(env).sendMail({
    from: `"${senderName}" <${senderEmail}>`,
    to,
    subject,
    text,
    html,
  });
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from the root folder
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: "/",
    server: {
      host: "::",
      port: 8085,
      hmr: {
        overlay: false,
      },
      proxy: {
        '/api/create-payment-intent': {
          target: 'http://localhost:3001',
          changeOrigin: true,
        }
      }
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      {
        name: 'email-api',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url === '/api/send-signing-email' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => {
                body += chunk;
              });
              
              req.on('end', async () => {
                try {
                  const data = JSON.parse(body);
                  const { signatories, documentId, documentTitle, ownerEmail, ownerName, subject, message, reminder } = data;

                  if (!signatories || !Array.isArray(signatories) || signatories.length === 0) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing signatories' }));
                    return;
                  }

                  // Same template as the Vercel function api/send-signing-email.js.
                  const { signingEmail } = await import('./api/_lib/emailTemplates.js');
                  const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://www.ezsignnow.com';
                  const emailPromises = signatories.map((sig: any) =>
                    sendEmailViaSmtp(env, {
                      to: sig.email,
                      ...signingEmail({ frontendUrl: origin, documentId, documentTitle, ownerEmail, ownerName, signer: sig, subject, message, reminder }),
                    })
                  );

                  await Promise.all(emailPromises);

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                } catch (err: any) {
                  console.error('Error dispatching signing emails:', err);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
                }
              });
            } else if (req.url === '/api/send-action-email' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', async () => {
                try {
                  const data = JSON.parse(body);
                  const { emails, documentTitle, actionType, actorName, reason, documentId } = data;

                  if (!emails || emails.length === 0) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing recipients' }));
                    return;
                  }

                  // Same template as the Vercel function api/send-action-email.js.
                  const { actionEmail } = await import('./api/_lib/emailTemplates.js');
                  const origin = req.headers.origin || 'https://www.ezsignnow.com';
                  const { subject: title, html: htmlContent, text: textContent } = actionEmail({ documentTitle, actionType, actorName, reason, documentId, frontendUrl: origin });

                  await Promise.all(emails.map((email: string) => sendEmailViaSmtp(env, {
                    to: email,
                    subject: title,
                    html: htmlContent,
                    text: textContent,
                  })));

                  res.statusCode = 200;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ success: true }));
                } catch (err: any) {
                  console.error('Error sending action email:', err);
                  res.statusCode = 500;
                  res.setHeader('Content-Type', 'application/json');
                  res.end(JSON.stringify({ error: err.message || 'Internal server error' }));
                }
              });
            } else if (req.url === '/api/ai-pdf' && req.method === 'POST') {
              // Same handler as the Vercel function api/ai-pdf.js, for local development.
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', async () => {
                let status = 500;
                let json: unknown = { error: 'Internal server error' };
                try {
                  const { handleAiPdf } = await import('./api/_lib/aiPdf.js');
                  ({ status, json } = await handleAiPdf(JSON.parse(body || '{}'), req.headers.authorization, {
                    ANTHROPIC_API_KEY: env.ANTHROPIC_API_KEY,
                    ANTHROPIC_MODEL: env.ANTHROPIC_MODEL,
                    SUPABASE_URL: env.VITE_SUPABASE_URL || 'https://tjsvkdvuspihphtcldot.supabase.co',
                    SUPABASE_ANON_KEY: env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_WgE6pWIOVhWvIc6VQpspvg_I70scyVl',
                  }));
                } catch (err: any) {
                  console.error('Error in ai-pdf:', err);
                }
                res.statusCode = status;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(json));
              });
            } else if (req.url?.startsWith('/api/fetch-url') && req.method === 'GET') {
              // Same as the Vercel function api/fetch-url.js, for local development.
              try {
                const { fetchPublicHtml } = await import('./api/_lib/fetchUrl.js');
                const target = new URL(req.url, 'http://localhost').searchParams.get('url') || '';
                const { html } = await fetchPublicHtml(target);
                res.statusCode = 200;
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
                res.end(html);
              } catch (err: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: err.message || "Couldn't fetch that page" }));
              }
            } else {
              next();
            }
          });
        }
      }
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
