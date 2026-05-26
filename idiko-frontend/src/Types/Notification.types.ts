// src/Types/Notification.types.tsx

/**
 * Channels we can notify a user through
 * (we start with SMS + Email, more can be added later)
 */
export type NotificationChannel = "SMS" | "EMAIL";

/**
 * Status of a notification lifecycle
 */
export type NotificationStatus =
  | "ACTIVE"      // Messages are being sent
  | "STOPPED"     // Manually or automatically stopped
  | "COMPLETED";  // Finished successfully (ID claimed & paid)

/**
 * Represents a scheduled notification job
 * created when an ID match is found
 */
export type NotificationJob = {
  /** Unique job ID */
  jobId: string;

  /** ID number that was matched */
  idNumber: string;

  /** First name only (used in message templates) */
  firstName: string;

  /** Contact details */
  primaryPhone?: string;
  secondaryPhone?: string;
  email?: string;

  /** Notification delivery channels */
  channels: NotificationChannel[];

  /** Job lifecycle status */
  status: NotificationStatus;

  /** When the match was first found */
  startDate: string;

  /** When notifications should stop (15 days later) */
  endDate: string;

  /** Last time a message was sent */
  lastSentAt?: string;

  /** How many times messages have been sent */
  sentCount: number;

  /** Maximum sends allowed (e.g. 15 days = 15 sends) */
  maxSends: number;

  /** Stop sending when ID status becomes Paid */
  stopOnPaid: boolean;
};
