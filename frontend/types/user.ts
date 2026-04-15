export interface AppUser {
  id: string;
  name: string;
  email: string;
  balance?: number;
  freezed_balance?: Record<string, number>;
}
