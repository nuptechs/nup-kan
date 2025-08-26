import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email functionality will be disabled.");
}

// Validate SendGrid API key format
if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  console.error("Invalid SendGrid API key format. API key must start with 'SG.'");
  console.error("Please configure a valid SendGrid API key to enable email functionality.");
}

let mailService = new MailService();
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

// Function to reinitialize the mail service with a new API key
export function reinitializeMailService(apiKey: string) {
  if (apiKey && apiKey.startsWith('SG.')) {
    mailService = new MailService();
    mailService.setApiKey(apiKey);
  }
}

interface WelcomeEmailParams {
  to: string;
  userName: string;
  userRole?: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  // Check if SendGrid is properly configured
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    return false;
  }

  try {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .logo { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
          .content { padding: 30px; background: #f8fafc; }
          .welcome-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">NuPtechs</div>
            <p>A Força tech que revoluciona negócios</p>
          </div>
          
          <div class="content">
            <div class="welcome-box">
              <h2>Olá ${params.userName}, 🚀</h2>
              
              <p>É um prazer ter você com a gente! 🎉</p>
              
              <p>A partir de agora, você faz parte do <strong>ecossistema NuPtechs</strong>, onde tecnologia e negócios se encontram para criar algo maior. Não somos apenas uma empresa de software: somos uma equipe apaixonada por transformar ideias em resultados e simplificar o que parece complexo.</p>
              
              <p>Aqui, cada clique abre portas para um novo universo de possibilidades, com soluções que unem inovação, estratégia e um toque humano que faz toda a diferença.</p>
              
              <p><strong>Nosso compromisso é claro:</strong> entregar valor real para você e para o seu negócio.</p>
              
              <p>👉 O próximo passo é simples: acesse a plataforma e comece a explorar todas as funcionalidades disponíveis.</p>
              
              <p>Se precisar de ajuda, conte com o nosso time – estamos prontos para caminhar com você.</p>
              
              <p><strong>Seja bem-vindo(a) à NuPtechs.</strong><br>
              A Força tech que revoluciona negócios.</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Com energia e entusiasmo,</strong><br>
            Equipe NuPtechs</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Olá ${params.userName},

É um prazer ter você com a gente! 🎉

A partir de agora, você faz parte do ecossistema NuPtechs, onde tecnologia e negócios se encontram para criar algo maior. Não somos apenas uma empresa de software: somos uma equipe apaixonada por transformar ideias em resultados e simplificar o que parece complexo.

Aqui, cada clique abre portas para um novo universo de possibilidades, com soluções que unem inovação, estratégia e um toque humano que faz toda a diferença.

Nosso compromisso é claro: entregar valor real para você e para o seu negócio.

👉 O próximo passo é simples: acesse a plataforma e comece a explorar todas as funcionalidades disponíveis.

Se precisar de ajuda, conte com o nosso time – estamos prontos para caminhar com você.

Seja bem-vindo(a) à NuPtechs.
A Força tech que revoluciona negócios.

---
Com energia e entusiasmo,
Equipe NuPtechs
    `;

    const senderDomain = process.env.SENDER_DOMAIN || 'replit.app';
    await mailService.send({
      to: params.to,
      from: `noreply@${senderDomain}`,
      subject: '🚀 Bem-vindo(a) ao universo NuPtechs',
      text: textContent,
      html: htmlContent,
    });

    console.log(`Welcome email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid email error:', error);
    return false;
  }
}

interface NotificationEmailParams {
  to: string;
  subject: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
}

export async function sendNotificationEmail(params: NotificationEmailParams): Promise<boolean> {
  // Check if SendGrid is properly configured
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    console.warn("SendGrid not configured. Skipping notification email.");
    return false;
  }

  try {
    const typeColors = {
      info: '#3b82f6',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444'
    };

    const color = typeColors[params.type || 'info'];

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          .container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
          .header { background: ${color}; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f8fafc; }
          .message-box { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid ${color}; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>Kanban</h2>
          </div>
          <div class="content">
            <div class="message-box">
              <p>${params.message}</p>
            </div>
          </div>
          <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema Kanban</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const senderDomain = process.env.SENDER_DOMAIN || 'replit.app';
    await mailService.send({
      to: params.to,
      from: `noreply@${senderDomain}`,
      subject: params.subject,
      text: params.message,
      html: htmlContent,
    });

    console.log(`Notification email sent successfully to ${params.to}`);
    return true;
  } catch (error) {
    console.error('SendGrid notification email error:', error);
    return false;
  }
}