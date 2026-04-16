export interface AppUser {
  id: string;
  name: string;
  firstName?: string;
  surname?: string;
  email: string;
  balance?: number;
  freezed_balance?: Record<string, number>;
}
