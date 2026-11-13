import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import type { Session } from '@/types/domain';

type SessionContextValue = {
  session: Session | null;
  signIn: (session: Session) => void;
  signOut: () => void;
  /** Patch the current session (used by demo controls to switch role or plan). */
  updateSession: (update: (current: Session) => Session) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

/**
 * Holds the signed-in user in memory. UI-only build: nothing is persisted,
 * so reloading the app returns to the welcome screen.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);

  const signIn = useCallback((next: Session) => setSession(next), []);
  const signOut = useCallback(() => setSession(null), []);
  const updateSession = useCallback(
    (update: (current: Session) => Session) => setSession((s) => (s ? update(s) : s)),
    [],
  );

  const value = useMemo(
    () => ({ session, signIn, signOut, updateSession }),
    [session, signIn, signOut, updateSession],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

/** For screens inside the signed-in area, where a session is guaranteed by the route guard. */
export function useCurrentSession(): Session {
  const { session } = useSession();
  if (!session) throw new Error('useCurrentSession called without a signed-in user');
  return session;
}
