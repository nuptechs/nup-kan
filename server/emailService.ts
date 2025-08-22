import { MailService } from '@sendgrid/mail';

if (!process.env.SENDGRID_API_KEY) {
  console.warn("SENDGRID_API_KEY environment variable is not set. Email functionality will be disabled.");
}

// Validate SendGrid API key format
if (process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  console.error("Invalid SendGrid API key format. API key must start with 'SG.'");
  console.error("Please configure a valid SendGrid API key to enable email functionality.");
}

const mailService = new MailService();
if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_API_KEY.startsWith('SG.')) {
  mailService.setApiKey(process.env.SENDGRID_API_KEY);
}

interface WelcomeEmailParams {
  to: string;
  userName: string;
  userRole?: string;
}

export async function sendWelcomeEmail(params: WelcomeEmailParams): Promise<boolean> {
  // Check if SendGrid is properly configured
  if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_API_KEY.startsWith('SG.')) {
    console.warn("SendGrid not configured. Skipping welcome email.");
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
            <div class="logo">uP - Kan</div>
            <p>Sistema de Gerenciamento Kanban</p>
          </div>
          
          <div class="content">
            <div class="welcome-box">
              <h2>Bem-vindo(a), ${params.userName}! 🎉</h2>
              
              <p>Estamos muito felizes em tê-lo(a) na nossa plataforma <strong>uP - Kan</strong>!</p>
              
              <p>Sua conta foi criada com sucesso com as seguintes informações:</p>
              <ul>
                <li><strong>Nome:</strong> ${params.userName}</li>
                <li><strong>Email:</strong> ${params.to}</li>
                ${params.userRole ? `<li><strong>Cargo:</strong> ${params.userRole}</li>` : ''}
              </ul>
              
              <p>Com o uP - Kan, você poderá:</p>
              <ul>
                <li>✅ Gerenciar tarefas de forma organizada</li>
                <li>✅ Colaborar eficientemente com sua equipe</li>
                <li>✅ Acompanhar o progresso dos projetos</li>
                <li>✅ Usar limites WIP para otimizar o fluxo de trabalho</li>
                <li>✅ Visualizar analytics detalhados</li>
              </ul>
              
              <p>Agora você pode começar a usar todas as funcionalidades do sistema. Explore, crie suas primeiras tarefas e organize seu fluxo de trabalho!</p>
            </div>
            
            <div style="text-align: center;">
              <p>Pronto para começar? Acesse a plataforma agora!</p>
            </div>
          </div>
          
          <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema uP - Kan</p>
            <p>Se você não se cadastrou em nossa plataforma, pode ignorar este email.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Bem-vindo(a) ao uP - Kan, ${params.userName}!

Sua conta foi criada com sucesso em nosso sistema de gerenciamento Kanban.

Informações da conta:
- Nome: ${params.userName}
- Email: ${params.to}
${params.userRole ? `- Cargo: ${params.userRole}` : ''}

Com o uP - Kan, você poderá gerenciar tarefas de forma organizada, colaborar com sua equipe e acompanhar o progresso dos projetos.

Agora você pode começar a usar todas as funcionalidades do sistema!

---
Este email foi enviado automaticamente pelo sistema uP - Kan.
    `;

    await mailService.send({
      to: params.to,
      from: 'noreply@up-kan.com', // Você pode alterar para seu domínio verificado
      subject: '🎉 Bem-vindo(a) ao uP - Kan! Sua conta foi criada com sucesso',
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
            <h2>uP - Kan</h2>
          </div>
          <div class="content">
            <div class="message-box">
              <p>${params.message}</p>
            </div>
          </div>
          <div class="footer">
            <p>Este email foi enviado automaticamente pelo sistema uP - Kan</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await mailService.send({
      to: params.to,
      from: 'noreply@up-kan.com',
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