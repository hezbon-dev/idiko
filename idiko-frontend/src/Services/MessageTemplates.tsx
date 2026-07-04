// src/services/MessageTemplates.tsx

export type NotificationChannel = "SMS" | "EMAIL";


const getFirstName = (fullName: string): string => {
  if (!fullName) return "";
  return fullName.trim().split(" ")[0];
};


export const idFoundMessage = (
  fullName: string,
  channel: NotificationChannel
): string => {
  const firstName = getFirstName(fullName);

  const baseMessage = `Good news ${firstName},your ID is ready for collection.Visit idiko.co.ke under (Search ID) to confirm,then visit Huduma Centre for collection.Thank you.`;

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

export function getNotificationMessage(firstName: string): string {
  const safeName =
    firstName && firstName.trim().length > 0
      ? firstName.trim()
      : "there";

  return `Good news ${safeName},your ID is ready for collection.Visit idiko.co.ke under (Search ID) to confirm, then visit Huduma Centre for collection.Thank you.`;
}
