/**
 * Email Service
 * SendGrid integration for transactional emails
 */

import sgMail from '@sendgrid/mail';
import db from '../models/index.js';

const { EmailTemplate } = db;

// Initialize SendGrid
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@agelessliterature.com';
const FROM_NAME = process.env.SENDGRID_FROM_NAME || 'Ageless Literature';
const REPLY_TO = process.env.SENDGRID_REPLY_TO || FROM_EMAIL;
const EMAIL_ENABLED = !!SENDGRID_API_KEY;
const NODE_ENV = process.env.NODE_ENV || 'development';

if (EMAIL_ENABLED) {
  sgMail.setApiKey(SENDGRID_API_KEY);
  console.log('[EmailService] SendGrid initialized');
} else {
  console.warn('[EmailService] SENDGRID_API_KEY not set - emails will be logged only');
}

/**
 * Validate email address format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return typeof email === 'string' && emailRegex.test(email);
}

/**
 * Strip HTML tags for plain text fallback
 */
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Replace template variables in text (supports {{variable}} syntax)
 */
function replaceVariables(text, variables) {
  if (!text) return '';
  let result = text;
  Object.keys(variables).forEach((key) => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, variables[key] || '');
  });
  return result;
}

/**
 * Fallback templates for common email types
 * Used when database templates don't exist
 */
const FALLBACK_TEMPLATES = {
  'membership-new': {
    subject: 'Welcome to {{planName}} - Ageless Literature',
    bodyHtml:
      '<h1>Welcome to Ageless Literature!</h1><p>Hi {{firstName}},</p><p>Thank you for joining our {{planName}} membership.</p><p><strong>Price:</strong> {{price}} / {{interval}}</p><p><strong>Next billing date:</strong> {{nextBillingDate}}</p><p><a href="{{accountUrl}}">Manage your membership</a></p><p>Best regards,<br>The Ageless Literature Team</p>',
  },
  'membership-cancelled': {
    subject: 'Membership Cancelled - Ageless Literature',
    bodyHtml:
      "<h1>Membership Cancelled</h1><p>Your membership has been cancelled as of {{cancellationDate}}.</p><p>We're sorry to see you go! If you change your mind, you can resubscribe anytime.</p>",
  },
  'membership-paused': {
    subject: 'Membership Paused - Ageless Literature',
    bodyHtml:
      '<h1>Membership Paused</h1><p>Your membership has been paused. You can resume it anytime from your account settings.</p>',
  },
  'membership-resumed': {
    subject: 'Membership Resumed - Ageless Literature',
    bodyHtml:
      '<h1>Welcome Back!</h1><p>Your membership has been resumed. Thank you for continuing with us!</p>',
  },
  'membership-payment-failed': {
    subject: 'Payment Failed - Ageless Literature',
    bodyHtml:
      '<h1>Payment Issue</h1><p>We were unable to process your payment. Please update your payment method to continue your membership.</p>',
  },
  'vendor-application-submitted': {
    subject: 'Vendor Application Received - Ageless Literature',
    bodyHtml:
      "<h1>Application Received</h1><p>Hi {{userName}},</p><p>Thank you for applying to become a vendor at Ageless Literature.</p><p><strong>Shop Name:</strong> {{shopName}}</p><p>We'll review your application and get back to you within 2-3 business days.</p>",
  },
  'vendor-application-approved': {
    subject: 'Vendor Application Approved - Ageless Literature',
    bodyHtml:
      '<h1>Congratulations!</h1><p>Your vendor application has been approved.</p><p><strong>Shop Name:</strong> {{shopName}}</p><p><a href="{{shopUrl}}">Visit your shop</a></p>',
  },
  'vendor-application-rejected': {
    subject: 'Vendor Application - Ageless Literature',
    bodyHtml:
      '<h1>Application Update</h1><p>Unfortunately, we are unable to approve your vendor application at this time.</p><p><strong>Reason:</strong> {{reason}}</p>',
  },
  'vendor-payout-created': {
    subject: 'Payout Initiated - Ageless Literature',
    bodyHtml:
      '<h1>Payout Initiated</h1><p>Hi {{firstName}},</p><p>A payout of ${{amount}} has been initiated to your account.</p><p>You should receive the funds within 2-5 business days.</p>',
  },
  'vendor-payout-completed': {
    subject: 'Payout Completed - Ageless Literature',
    bodyHtml:
      '<h1>Payout Completed</h1><p>Your payout of ${{amount}} has been successfully sent.</p>',
  },
  'payout-failed': {
    subject: 'Payout Failed - Ageless Literature',
    bodyHtml:
      '<h1>Payout Issue</h1><p>Hi {{firstName}},</p><p>Unfortunately, your payout of ${{amount}} failed.</p><p><strong>Reason:</strong> {{reason}}</p><p>Please contact support for assistance.</p>',
  },
  'stripe-account-active': {
    subject: 'Stripe Account Active - Ageless Literature',
    bodyHtml:
      '<h1>Payment Account Active</h1><p>Hi {{firstName}},</p><p>Your Stripe Connect account for {{shopName}} is now active!</p><p>You can now receive payouts for your sales.</p>',
  },
  'stripe-account-restricted': {
    subject: 'Account Verification Needed - Ageless Literature',
    bodyHtml:
      '<h1>Action Required</h1><p>Hi {{firstName}},</p><p>Your payment account for {{shopName}} requires additional verification.</p><p><strong>Reason:</strong> {{reason}}</p><p>Please complete the verification process to continue receiving payouts.</p>',
  },
  'paypal-payout-succeeded': {
    subject: 'PayPal Payout Sent - Ageless Literature',
    bodyHtml:
      '<h1>Payout Sent</h1><p>Your PayPal payout of ${{amount}} has been sent successfully.</p>',
  },
  'paypal-payout-failed': {
    subject: 'PayPal Payout Failed - Ageless Literature',
    bodyHtml:
      '<h1>Payout Issue</h1><p>Your PayPal payout of ${{amount}} failed.</p><p><strong>Reason:</strong> {{reason}}</p>',
  },
  'vendor-withdrawal-requested': {
    subject: 'Withdrawal Request Received - Ageless Literature',
    bodyHtml:
      '<h1>Withdrawal Request</h1><p>Your withdrawal request for ${{amount}} has been received and is being processed.</p>',
  },
  'vendor-withdrawal-approved': {
    subject: 'Withdrawal Approved - Ageless Literature',
    bodyHtml:
      '<h1>Withdrawal Approved</h1><p>Your withdrawal request for ${{amount}} has been approved.</p>',
  },
  'vendor-withdrawal-completed': {
    subject: 'Withdrawal Completed - Ageless Literature',
    bodyHtml:
      '<h1>Withdrawal Complete</h1><p>Your withdrawal of ${{amount}} has been completed.</p>',
  },
  'vendor-withdrawal-rejected': {
    subject: 'Withdrawal Request - Ageless Literature',
    bodyHtml:
      '<h1>Withdrawal Update</h1><p>Your withdrawal request for ${{amount}} could not be processed.</p><p><strong>Reason:</strong> {{reason}}</p>',
  },
  'vendor-suspended': {
    subject: 'Account Status Update - Ageless Literature',
    bodyHtml:
      '<h1>Account Suspended</h1><p>Your vendor account has been suspended.</p><p><strong>Reason:</strong> {{reason}}</p><p>Please contact support for more information.</p>',
  },
  // Auction notifications (Phase 2)
  auction_won_payment_due: {
    subject: 'Congratulations! You Won: {{auctionTitle}}',
    bodyHtml:
      '<h1>Congratulations on Your Winning Bid!</h1><p>Hi {{userName}},</p><p>You have won the auction for <strong>{{auctionTitle}}</strong>!</p><p><strong>Winning Bid:</strong> ${{winningAmount}}</p><p><strong>Auction ID:</strong> {{auctionId}}</p><p><strong>Payment Due:</strong> {{paymentDeadline}}</p><p>Please complete your payment to secure your item:</p><p><a href="{{paymentLink}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;margin:16px 0;">Complete Payment</a></p><p>If you have any questions, please contact the vendor or our support team.</p><p>Thank you for your purchase!</p>',
  },
  // Order notifications (Phase 2)
  order_confirmation_buyer: {
    subject: 'Order Confirmation - {{orderNumber}}',
    bodyHtml:
      '<h1>Thank You for Your Order!</h1>' +
      '<p>Hi {{userName}},</p>' +
      '<p>Your order has been confirmed and is being processed.</p>' +
      '<p><strong>Order Number:</strong> {{orderNumber}}</p>' +
      '<p><strong>Order Total:</strong> ${{orderTotal}}</p>' +
      '<h3>Order Items:</h3>' +
      '<ul>{{itemsList}}</ul>' +
      '<p><strong>Shipping Address:</strong><br/>{{{shippingAddress}}}</p>' +
      '<p>You can track your order status in your account:</p>' +
      '<p><a href="{{orderLink}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;margin:16px 0;">View Order</a></p>' +
      '<p>Thank you for shopping with Ageless Literature!</p>',
  },
  order_new_vendor: {
    subject: 'New Order - {{orderNumber}}',
    bodyHtml:
      '<h1>You Have a New Order!</h1>' +
      '<p>Hi {{vendorName}},</p>' +
      '<p>You have received a new order that includes items from your shop.</p>' +
      '<p><strong>Order Number:</strong> {{orderNumber}}</p>' +
      '<p><strong>Order Date:</strong> {{orderDate}}</p>' +
      '<h3>Your Items in This Order:</h3>' +
      '<ul>{{itemsList}}</ul>' +
      '<p><strong>Vendor Total:</strong> ${{vendorTotal}}</p>' +
      '<p>Please prepare these items for shipment. You can manage this order in your vendor dashboard:</p>' +
      '<p><a href="{{orderLink}}" style="display:inline-block;padding:12px 24px;background:#000;color:#fff;text-decoration:none;margin:16px 0;">View Order Details</a></p>' +
      '<p>Thank you for being a valued vendor!</p>',
  },
  'test-email': {
    subject: 'Test Email - Ageless Literature',
    bodyHtml:
      '<h1>Test Email</h1><p>This is a test email from Ageless Literature.</p><p><strong>Test Data:</strong></p><pre>{{testData}}</pre>',
  },
};

/**
 * Get template from database or fallback
 */
async function getTemplate(templateName) {
  try {
    // Try to load from database
    if (EmailTemplate) {
      const dbTemplate = await EmailTemplate.findOne({
        where: { name: templateName, active: true },
      });

      if (dbTemplate) {
        return {
          subject: dbTemplate.subject,
          bodyHtml: dbTemplate.bodyHtml,
          source: 'database',
        };
      }
    }
  } catch (error) {
    console.warn(
      `[EmailService] Database template lookup failed for "${templateName}":`,
      error.message,
    );
  }

  // Use fallback template
  const fallback = FALLBACK_TEMPLATES[templateName];
  if (fallback) {
    return {
      subject: fallback.subject,
      bodyHtml: fallback.bodyHtml,
      source: 'fallback',
    };
  }

  // No template found - return generic
  console.warn(`[EmailService] No template found for "${templateName}" - using generic`);
  return {
    subject: `Notification from Ageless Literature`,
    bodyHtml: `<p>You have a new notification from Ageless Literature.</p>`,
    source: 'generic',
  };
}

/**
 * Send templated email
 * @param {string} templateName - Name of the email template
 * @param {string} recipient - Recipient email address
 * @param {object} variables - Variables to inject into template
 * @returns {Promise<boolean>} - Success status
 */
export async function sendTemplatedEmail(templateName, recipient, variables = {}) {
  try {
    // Validate recipient
    if (!isValidEmail(recipient)) {
      console.error(`[EmailService] Invalid recipient email: ${recipient}`);
      return false;
    }

    // Get template
    const template = await getTemplate(templateName);

    // Replace variables in subject and body
    const subject = replaceVariables(template.subject, variables);
    const html = replaceVariables(template.bodyHtml, variables);
    const text = htmlToText(html);

    // Prepare email message
    const msg = {
      to: recipient,
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      replyTo: REPLY_TO,
      subject,
      text,
      html,
    };

    // Send or log
    if (EMAIL_ENABLED) {
      await sgMail.send(msg);
      console.log(
        `[EmailService] Email sent: ${templateName} -> ${recipient} (${template.source})`,
      );
    } else {
      console.log(
        `[EmailService] WARNING: Email not sent (SendGrid disabled): ${templateName} -> ${recipient}`,
      );
      console.log(`[EmailService] Subject: ${subject}`);
      console.log(`[EmailService] Variables:`, variables);
    }

    return true;
  } catch (error) {
    // Log error without exposing API key
    const errorMessage = error.response?.body?.errors
      ? JSON.stringify(error.response.body.errors)
      : error.message;

    console.error(`[EmailService] ✗ Failed to send ${templateName}:`, {
      recipient,
      error: errorMessage,
      code: error.code,
    });

    return false;
  }
}

/**
 * Send test email
 * @param {string} recipient - Test recipient email
 * @param {object} data - Email data
 * @returns {Promise<object>} - Result with preview
 */
export async function sendTestEmail(recipient, data = {}) {
  try {
    const testData = JSON.stringify(data, null, 2);
    const success = await sendTemplatedEmail('test-email', recipient, {
      testData,
    });

    return {
      success,
      message: success
        ? `Test email sent to ${recipient}`
        : `Failed to send test email to ${recipient}`,
    };
  } catch (error) {
    console.error('[EmailService] Test email error:', error.message);
    return {
      success: false,
      message: `Test email error: ${error.message}`,
    };
  }
}

export default {
  sendTemplatedEmail,
  sendTestEmail,
};

/**
 * ==============================================================================
 * SMS Service - Twilio Integration (Phase 5)
 * ==============================================================================
 * Transactional SMS with TCPA compliance (opt-in required)
 */

// Initialize Twilio
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM_NUMBER = process.env.TWILIO_FROM_NUMBER;
const SMS_ENABLED = !!(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_NUMBER);
const SMS_ENV_TAG = process.env.SMS_ENV_TAG || NODE_ENV;

let twilioClient = null;
if (SMS_ENABLED) {
  try {
    const twilio = await import('twilio');
    twilioClient = twilio.default(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    console.log('[SMSService] Twilio initialized');
  } catch (error) {
    console.warn('[SMSService] Twilio not installed - SMS disabled. Run: npm install twilio');
  }
} else {
  console.warn('[SMSService] Twilio credentials not set - SMS will be logged only');
}

/**
 * Validate E.164 phone format
 * @param {string} phone - Phone number
 * @returns {boolean} - Valid format
 */
function isValidE164(phone) {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return typeof phone === 'string' && e164Regex.test(phone);
}

/**
 * Send SMS via Twilio
 * @param {string} toE164 - Recipient phone in E.164 format (+1234567890)
 * @param {string} message - SMS message (max 160 chars recommended)
 * @param {object} options - Additional options
 * @param {string} options.correlationId - Unique ID for tracking
 * @param {string} options.type - Notification type
 * @param {string} options.entityId - Related entity ID
 * @returns {Promise<object>} - { ok, providerMessageId, error }
 */
export async function sendSms(toE164, message, options = {}) {
  const { correlationId, type, entityId } = options;

  try {
    // Validate phone number
    if (!isValidE164(toE164)) {
      throw new Error(`Invalid E.164 phone format: ${toE164}`);
    }

    // Validate message length (Twilio recommends 160 chars for single segment)
    if (!message || message.length === 0) {
      throw new Error('SMS message cannot be empty');
    }

    if (message.length > 1600) {
      throw new Error(`SMS message too long: ${message.length} chars (max 1600)`);
    }

    // Prefix with env tag in non-production
    const finalMessage =
      SMS_ENV_TAG !== 'production' ? `[${SMS_ENV_TAG.toUpperCase()}] ${message}` : message;

    if (SMS_ENABLED && twilioClient) {
      // Send via Twilio
      const result = await twilioClient.messages.create({
        body: finalMessage,
        to: toE164,
        from: TWILIO_FROM_NUMBER,
      });

      console.log(`[SMSService] SMS sent: ${type || 'unknown'} -> ${toE164} | sid=${result.sid}`);

      return {
        ok: true,
        providerMessageId: result.sid,
        error: null,
      };
    } else {
      // Log only mode
      console.log(
        `[SMSService] WARNING: SMS not sent (Twilio disabled): ${type || 'unknown'} -> ${toE164}`,
      );
      console.log(`[SMSService] Message: ${finalMessage}`);
      console.log(`[SMSService] Metadata:`, { correlationId, type, entityId });

      return {
        ok: true, // Consider successful in dev
        providerMessageId: `dev-${Date.now()}`,
        error: null,
      };
    }
  } catch (error) {
    // Log error without exposing credentials
    const errorMessage = error.message || 'Unknown SMS error';
    console.error(`[SMSService] ✗ Failed to send SMS:`, {
      to: toE164,
      type,
      error: errorMessage,
      code: error.code,
    });

    return {
      ok: false,
      providerMessageId: null,
      error: errorMessage,
    };
  }
}

/**
 * SMS message templates (transactional only)
 */
const SMS_TEMPLATES = {
  VERIFICATION: (code) =>
    `Ageless Literature verification code: ${code}. Valid for 10 minutes. Reply STOP to opt out.`,

  AUCTION_WON_PAYMENT_DUE: (data) =>
    `Congratulations! You won "${data.auctionTitle}". Payment of $${data.winningAmount} due. Check your account: ${data.paymentLink}`,

  PAYMENT_FAILED: (data) =>
    `Payment failed for ${data.description}. Amount: $${data.amount}. Please update your payment method: ${data.paymentLink}`,

  STOP_CONFIRMATION: () =>
    `You've been unsubscribed from Ageless Literature SMS notifications. Reply START to re-subscribe.`,

  HELP_RESPONSE: () =>
    `Ageless Literature SMS: For support, email support@agelessliterature.com. Reply STOP to unsubscribe.`,
};

/**
 * Send verification code SMS
 * @param {string} phoneE164 - Phone in E.164 format
 * @param {string} code - 6-digit verification code
 * @returns {Promise<object>} - Send result
 */
export async function sendVerificationSms(phoneE164, code) {
  const message = SMS_TEMPLATES.VERIFICATION(code);
  return sendSms(phoneE164, message, {
    type: 'SMS_VERIFICATION',
    correlationId: `verify-${Date.now()}`,
  });
}

export { SMS_TEMPLATES, SMS_ENABLED };
