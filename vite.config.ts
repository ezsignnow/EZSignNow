import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import nodemailer from "nodemailer";

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
                  const { signatories, documentId, documentTitle, ownerEmail } = data;

                  if (!signatories || !Array.isArray(signatories) || signatories.length === 0) {
                    res.statusCode = 400;
                    res.setHeader('Content-Type', 'application/json');
                    res.end(JSON.stringify({ error: 'Missing signatories' }));
                    return;
                  }

                  // Read credentials from env
                  const smtpHost = env.SMTP_HOST || "smtppro.zoho.com";
                  const smtpPort = Number(env.SMTP_PORT) || 587;
                  const smtpUser = env.SMTP_USER || "support@ezsignnow.com";
                  const smtpPass = env.SMTP_PASS || "Techl@der@2023";
                  const smtpSenderName = env.SMTP_SENDER_NAME || "EZSignNow";
                  const smtpSenderEmail = env.SMTP_SENDER_EMAIL || "support@ezsignnow.com";

                  // Setup transporter
                  const transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: smtpPort,
                    secure: smtpPort === 465, // true for 465, false for 587
                    auth: {
                      user: smtpUser,
                      pass: smtpPass,
                    },
                  });

                  // Dispatch email to each signatory
                  const emailPromises = signatories.map(async (sig: any) => {
                    const origin = req.headers.origin || req.headers.referer?.replace(/\/$/, '') || 'https://www.ezsignnow.com';
                    const signUrl = `${origin}/document/${documentId}/view`;
                    
                    const htmlContent = `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="utf-8">
                        <title>Signature Requested</title>
                        <style>
                          body {
                            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                            background-color: #f8fafc;
                            color: #334155;
                            margin: 0;
                            padding: 0;
                          }
                          .container {
                            max-width: 600px;
                            margin: 40px auto;
                            background: #ffffff;
                            border: 1px solid #f1f5f9;
                            border-radius: 16px;
                            overflow: hidden;
                            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
                          }
                          .header {
                            background-color: #258ffb;
                            padding: 32px;
                            text-align: center;
                          }
                          .header h1 {
                            color: #ffffff;
                            margin: 0;
                            font-size: 24px;
                            font-weight: 800;
                            letter-spacing: -0.5px;
                          }
                          .content {
                            padding: 40px;
                          }
                          .content p {
                            font-size: 16px;
                            line-height: 24px;
                            margin: 0 0 24px 0;
                            color: #475569;
                          }
                          .doc-box {
                            background-color: #f8fafc;
                            border: 1px solid #e2e8f0;
                            border-radius: 12px;
                            padding: 20px;
                            margin-bottom: 32px;
                          }
                          .doc-title {
                            font-weight: 700;
                            font-size: 17px;
                            color: #1e293b;
                            margin-bottom: 6px;
                          }
                          .doc-meta {
                            font-size: 13px;
                            color: #64748b;
                          }
                          .cta-container {
                            text-align: center;
                            margin-bottom: 32px;
                          }
                          .cta-button {
                            display: inline-block;
                            background-color: #258ffb;
                            color: #ffffff !important;
                            text-decoration: none;
                            padding: 14px 32px;
                            font-size: 15px;
                            font-weight: 700;
                            border-radius: 9999px;
                            box-shadow: 0 4px 6px -1px rgba(37, 143, 251, 0.2), 0 2px 4px -2px rgba(37, 143, 251, 0.2);
                            transition: background-color 0.2s;
                          }
                          .cta-button:hover {
                            background-color: #1d7ee6;
                          }
                          .footer {
                            padding: 32px;
                            background-color: #f8fafc;
                            border-top: 1px solid #f1f5f9;
                            text-align: center;
                            font-size: 12px;
                            color: #94a3b8;
                            font-weight: 500;
                          }
                          .footer a {
                            color: #64748b;
                            text-decoration: underline;
                          }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h1>EZSignNow</h1>
                          </div>
                          <div class="content">
                            <p>Hello <strong>${sig.name}</strong>,</p>
                            <p><strong>${ownerEmail}</strong> has requested your signature on the document listed below:</p>
                            
                            <div class="doc-box">
                              <div class="doc-title">${documentTitle}</div>
                              <div class="doc-meta">Role: Signatory #${sig.order_num || 1}</div>
                            </div>
                            
                            <div class="cta-container">
                              <a href="${signUrl}" class="cta-button">Review & Sign Document</a>
                            </div>
                            
                            <p>Alternatively, you can copy and paste this URL into your browser:</p>
                            <p style="font-size: 13px; word-break: break-all; background-color: #f1f5f9; padding: 12px; border-radius: 8px; font-family: monospace;">${signUrl}</p>
                          </div>
                          <div class="footer">
                            Sent securely by <strong style="color: #64748b;">EZSignNow</strong>.<br>
                            If you did not expect this request, please ignore this email.
                          </div>
                        </div>
                      </body>
                      </html>
                    `;

                    await transporter.sendMail({
                      from: `"${smtpSenderName}" <${smtpSenderEmail}>`,
                      to: sig.email,
                      subject: `Signature Request: ${documentTitle}`,
                      text: `Hello ${sig.name},\n\n${ownerEmail} has requested your signature on "${documentTitle}".\n\nReview and sign the document here: ${signUrl}\n\nThank you,\nEZSignNow Team`,
                      html: htmlContent,
                    });
                  });

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
