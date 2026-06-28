export type SubscriptionStatus =
  | "ESSAI"
  | "ACTIF"
  | "EXPIRE";

export interface Subscription {
  id: string;
  userId: string;
  status: SubscriptionStatus;
  startDate: string;
  endDate: string;
  amount: number;
}