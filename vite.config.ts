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
            } else if (req.url === '/api/send-verification-code' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', () => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, mocked: true }));
              });
            } else if (req.url === '/api/send-action-email' && req.method === 'POST') {
              let body = '';
              req.on('data', chunk => body += chunk);
              req.on('end', () => {
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, mocked: true }));
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
