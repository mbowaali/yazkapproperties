import { sql } from "@/lib/db";
import { NextResponse } from "next/server";
import { checkSession, checkAdmin } from "@/lib/auth";
import { createHash, randomUUID } from "crypto";
import { sendInviteEmail, sendInviteSMS, sendInviteWhatsApp } from "@/lib/email";

// Generate a secure invite token and its hash for storage
function generateInviteToken() {
  const token = crypto.randomUUID() + crypto.randomUUID();
  const tokenHash = createHash("sha256").update(token).digest("hex");
  return { token, tokenHash };
}

export async function POST(request: Request) {
  const session = await checkSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await checkAdmin(session);

  try {
    const { tenantIds, channel = "email" } = await request.json();
    
    if (!Array.isArray(tenantIds) || tenantIds.length === 0) {
      return NextResponse.json({ error: "No tenants selected for invitation" }, { status: 400 });
    }

    // Get all selected tenants with their contact info
    const idValues = tenantIds.map(Number);
    const placeholders = idValues.map((_, i) => `$${i + 1}`).join(", ");
    const { rows: tenants } = await sql.query(
      `SELECT id, full_name, email, phone, unit_label 
       FROM tenants 
       WHERE id IN (${placeholders}) AND email IS NOT NULL AND email != ''`,
      idValues
    );

    if (tenants.length === 0) {
      return NextResponse.json({ error: "No valid tenants with email addresses found" }, { status: 400 });
    }

    const inviteResults = [];
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://yazkapproperties.com";

    // Create invites and send communications
    for (const tenant of tenants) {
      // First check if this tenant already has a user account created
      const { rows: existingUsers } = await sql`
        SELECT id FROM users 
        WHERE email = ${tenant.email} AND role = 'tenant'
      `;

      let userId: number;
      
      if (existingUsers.length > 0) {
        // Use existing user ID
        userId = existingUsers[0].id;
      } else {
        // Create a new user record for this tenant (they'll set their password during setup)
        const { rows: newUser } = await sql`
          INSERT INTO users (email, full_name, phone, role, approved)
          VALUES (${tenant.email}, ${tenant.full_name}, ${tenant.phone}, 'tenant', true)
          RETURNING id
        `;
        userId = newUser[0].id;
      }

      // Check if there's an existing active invite for this user
      const { rows: existingInvites } = await sql`
        SELECT id FROM tenant_setup_invites 
        WHERE user_id = ${userId} AND completed_at IS NULL AND expires_at > NOW()
      `;

      if (existingInvites.length > 0) {
        inviteResults.push({ tenantId: tenant.id, userId, status: "skipped", reason: "Active invite already exists" });
        continue;
      }

      // Generate secure invite token
      const { token, tokenHash } = generateInviteToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      const inviteLink = `${baseUrl}/accept-invite?token=${token}`;

      // Store invite in database with the correct user ID
      const { rows: newInvite } = await sql`
        INSERT INTO tenant_setup_invites 
        (user_id, token_hash, expires_at, created_by)
        VALUES (${userId}, ${tokenHash}, ${expiresAt.toISOString()}, ${session.id})
        RETURNING id
      `;

      // Log the communication in messages table
      await sql`
        INSERT INTO messages 
        (sender_id, sender_name, channel, body, is_alert)
        VALUES (
          ${session.id}, 
          ${session.full_name || 'Admin'}, 
          ${channel === 'sms' ? 'sms' : 'email'}, 
          ${`Invitation sent to ${tenant.full_name} for their account setup. Link: ${inviteLink}`},
          true
        )
      `;

       // Send the actual invite communications using our services
        let emailSent = false;
        let smsSent = false;
        let whatsappSent = false;

       if (channel === "email" || channel === "both") {
          if (tenant.email) {
            const emailResult = await sendInviteEmail(
              tenant.email,
              tenant.full_name,
              tenant.unit_label,
              inviteLink
            );
            emailSent = emailResult.success;
          }
        }

        if (channel === "sms" || channel === "both") {
          if (tenant.phone) {
            const smsResult = await sendInviteSMS(
              tenant.phone,
              tenant.full_name,
              tenant.unit_label,
              inviteLink
            );
            smsSent = smsResult.success;
          }
        }

        if (channel === "whatsapp" || channel === "both") {
          if (tenant.phone) {
            const whatsappResult = await sendInviteWhatsApp(
              tenant.phone,
              tenant.full_name,
              tenant.unit_label,
              inviteLink
            );
            whatsappSent = whatsappResult.success;
          }
        }

       // Mark as sent if any communication was sent, or if services aren't configured yet
       const anyCommunicationSent = emailSent || smsSent || whatsappSent || (!process.env.RESEND_API_KEY && !process.env.TWILIO_ACCOUNT_SID);
       inviteResults.push({ 
          tenantId: tenant.id, 
          inviteId: newInvite[0].id, 
          status: anyCommunicationSent ? "sent" : "failed",
          channel,
          emailSent,
          smsSent,
          whatsappSent
        });
    }

    return NextResponse.json({ 
      success: true, 
      sent: inviteResults.filter(r => r.status === "sent").length,
      skipped: inviteResults.filter(r => r.status === "skipped").length,
      results: inviteResults 
    });

  } catch (error) {
    console.error("Error sending bulk tenant invites:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}