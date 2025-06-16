import { useAuthContext } from '../lib/auth';

export function useAuth() {
  return useAuthContext();
}
