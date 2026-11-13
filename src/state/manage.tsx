import { createContext, useContext, useState, type ReactNode } from 'react';

import { demoTeam } from '@/mocks/activity';
import { useData } from '@/state/data';
import type { FeatureRequest, Role, TeamMember, User } from '@/types/domain';

export type NewMemberInput = { name: string; login: string; role: Role; password: string };

type ManageContextValue = {
  team: TeamMember[];
  /** False when the email or username is already on the team. */
  isLoginFree: (login: string) => boolean;
  addMember: (input: NewMemberInput) => void;
  removeMember: (id: number) => void;
  /** UI-only: the new password is not stored anywhere. */
  resetPassword: (id: number) => void;
  /** Keeps the team list in step when someone edits their own profile. */
  updateMember: (user: User) => void;
  requests: FeatureRequest[];
  sendRequest: (input: { need: string; how: string }) => void;
};

const ManageContext = createContext<ManageContextValue | null>(null);

let seq = 90_000;

/** Team and feature requests for the Manage screens. In memory only. */
export function ManageProvider({ children }: { children: ReactNode }) {
  const { logActivity } = useData();
  const [team, setTeam] = useState<TeamMember[]>(demoTeam);
  const [requests, setRequests] = useState<FeatureRequest[]>([]);

  const norm = (s: string) => s.trim().toLowerCase();

  const value: ManageContextValue = {
    team,
    isLoginFree: (login) => !team.some((m) => norm(m.email) === norm(login)),
    addMember: ({ name, login, role }) => {
      const member: TeamMember = {
        id: seq++,
        name: name.trim(),
        email: norm(login),
        phone: null,
        role,
        isOwner: false,
        createdAt: new Date().toISOString(),
        lastActiveAt: null,
      };
      setTeam((t) => [...t, member]);
      logActivity('userAdded', member.name);
    },
    removeMember: (id) => {
      const member = team.find((m) => m.id === id);
      setTeam((t) => t.filter((m) => m.id !== id));
      if (member) logActivity('userRemoved', member.name);
    },
    resetPassword: (id) => {
      const member = team.find((m) => m.id === id);
      if (member) logActivity('passwordReset', member.name);
    },
    updateMember: (user) => setTeam((t) => t.map((m) => (m.id === user.id ? { ...m, ...user } : m))),
    requests,
    sendRequest: ({ need, how }) => {
      setRequests((r) => [{ id: seq++, need: need.trim(), how: how.trim(), createdAt: new Date().toISOString() }, ...r]);
    },
  };

  return <ManageContext.Provider value={value}>{children}</ManageContext.Provider>;
}

export function useManage(): ManageContextValue {
  const ctx = useContext(ManageContext);
  if (!ctx) throw new Error('useManage must be used inside <ManageProvider>');
  return ctx;
}
