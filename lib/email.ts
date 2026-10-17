import { Resend } from 'resend';
import twilio from 'twilio';
import webPush from 'web-push';

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Configure web push if we have the keys
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT) {
  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

export async function sendInviteEmail(
  to: string,
  tenantName: string,
  unitLabel: string,
  inviteLink: string
) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Yazkap Properties';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not configured. Skipping actual email send.');
    return { success: false, error: 'Email service not configured' };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  try {
    const { data, error } = await resend.emails.send({
      from: `${appName} <${fromEmail}>`,
      to: [to],
      subject: `Complete your account setup for ${appName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Welcome to ${appName}!</h2>
          <p>Hi ${tenantName},</p>
          <p>You've been invited to set up your tenant account for your unit at ${unitLabel}.</p>
          <p>Please click the link below to complete your account setup:</p>
          <p><a href="${inviteLink}" style="display: inline-block; background-color: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px;">Set Up Your Account</a></p>
          <p>This link will expire in 7 days.</p>
          <p>If you need help, please contact our support team.</p>
          <hr>
          <p style="color: #666; font-size: 12px;">${appName} - Property Management</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send email:', error);
      return { success: false, error };
    }

    console.log(`Invite email sent to ${to}`, data);
    return { success: true, data };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}

export async function sendInviteSMS(
  to: string,
  tenantName: string,
  unitLabel: string,
  inviteLink: string
) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Yazkap Properties';
  const fromPhone = process.env.TWILIO_FROM_PHONE;

  if (!twilioClient || !fromPhone) {
    console.warn('Twilio not configured. Skipping actual SMS send.');
    return { success: false, error: 'SMS service not configured' };
  }

  try {
    const message = await twilioClient.messages.create({
      body: `${appName}: Hi ${tenantName}, set up your tenant account for ${unitLabel}. Complete your setup here: ${inviteLink} (expires in 7 days)`,
      from: fromPhone,
      to: to,
    });

    console.log(`Invite SMS sent to ${to}`, message.sid);
    return { success: true, data: message };
  } catch (error) {
    console.error('Failed to send SMS:', error);
    return { success: false, error };
  }
}

export async function sendInviteWhatsApp(
  to: string,
  tenantName: string,
  unitLabel: string,
  inviteLink: string
) {
  const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Yazkap Properties';
  const fromWhatsApp = process.env.TWILIO_WHATSAPP_FROM;

  if (!twilioClient || !fromWhatsApp) {
    console.warn('Twilio WhatsApp not configured. Skipping actual WhatsApp send.');
    return { success: false, error: 'WhatsApp service not configured' };
  }

  const toWhatsApp = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
  const fromWhatsAppFormatted = fromWhatsApp.startsWith('whatsapp:') ? fromWhatsApp : `whatsapp:${fromWhatsApp}`;

  try {
    const message = await twilioClient.messages.create({
      body: `${appName}: Hi ${tenantName}, set up your tenant account for ${unitLabel}. Complete your setup here: ${inviteLink} (expires in 7 days)`,
      from: fromWhatsAppFormatted,
      to: toWhatsApp,
    });

    console.log(`Invite WhatsApp sent to ${to}`, message.sid);
    return { success: true, data: message };
  } catch (error) {
    console.error('Failed to send WhatsApp:', error);
    return { success: false, error };
  }
}

// Send web push notification to a user if they have an active subscription
export async function sendWebPushNotification(
  userId: number,
  title: string,
  body: string,
  url: string = "/"
) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.warn('VAPID keys not configured. Skipping web push.');
    return { success: false, error: 'Web push not configured' };
  }

  try {
    // We would normally fetch the user's push subscriptions from the database
    // For now, we'll just log that we would send a push notification
    console.log(`Would send web push to user ${userId}: ${title} - ${body}`);
    return { success: true };
  } catch (error) {
    console.error('Error sending web push:', error);
    return { success: false, error };
  }
}