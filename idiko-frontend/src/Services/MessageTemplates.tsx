// src/services/MessageTemplates.tsx

/**
 * Central place for all notification message templates
 * Keeps messages consistent and easy to update later
 */

export type NotificationChannel = "SMS" | "EMAIL";

/**
 * Extract first name safely from full name
 */
const getFirstName = (fullName: string): string => {
  if (!fullName) return "";
  return fullName.trim().split(" ")[0];
};

/**
 * ID FOUND notification message
 */
export const idFoundMessage = (
  fullName: string,
  channel: NotificationChannel
): string => {
  const firstName = getFirstName(fullName);

  const baseMessage = `Good news ${firstName}, your ID is available and ready for pickup.Please proceed to idiko.co.ke website under "Find My ID"  to search and claim it, or visit your nearest Huduma Centre for assistance.Thank you.`;

  // You can slightly adjust wording per channel later if needed
  switch (channel) {
    case "SMS":
      return baseMessage;
    case "EMAIL":
      return baseMessage;
    default:
      return baseMessage;
  }
};

/**
 * (Future) Payment reminder / follow-up templates can go here
 */

// src/services/MessageTemplates.tsx

/**
 * Generates the notification message sent to users
 * when their ID has been found.
 *
 * Only first name is used for privacy and friendliness.
 */
export function getNotificationMessage(firstName: string): string {
  const safeName =
    firstName && firstName.trim().length > 0
      ? firstName.trim()
      : "there";

  return `Good news ${safeName}, your ID is available and ready for pickup.Please proceed to idiko.co.ke website under "Find My ID"  to search and claim it,or visit your nearest Huduma Centre for assistance.Thank you.`;
}
