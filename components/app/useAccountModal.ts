'use client';

import { useCallback, useState } from 'react';
import type {
  AccountAuthMode,
  AccountModalSection,
} from '@/components/AccountModal';
import { PLAYABLE_GAME_CATALOG, type PlayableGameId } from '@/lib/guest-trial';

/** Account modal state; supports opening straight to Email Sign-Up / the Guest Trial Gate. */
export function useAccountModal() {
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountInitialSection, setAccountInitialSection] =
    useState<AccountModalSection>('profile');
  const [accountInitialAuthMode, setAccountInitialAuthMode] =
    useState<AccountAuthMode>('signin');
  const [registrationGateGameTitle, setRegistrationGateGameTitle] = useState<
    string | null
  >(null);

  const openAccountModal = useCallback(
    (opts?: {
      section?: AccountModalSection;
      authMode?: AccountAuthMode;
      gateGameId?: PlayableGameId | null;
    }) => {
      setAccountInitialSection(opts?.section ?? 'profile');
      setAccountInitialAuthMode(opts?.authMode ?? 'signin');
      setRegistrationGateGameTitle(
        opts?.gateGameId ? PLAYABLE_GAME_CATALOG[opts.gateGameId].title : null
      );
      setAccountOpen(true);
    },
    []
  );

  const openRegistrationGate = useCallback(
    (gameId?: PlayableGameId) => {
      openAccountModal({
        section: 'auth',
        authMode: 'signup',
        gateGameId: gameId ?? null,
      });
    },
    [openAccountModal]
  );

  const closeAccountModal = useCallback(() => {
    setAccountOpen(false);
    setRegistrationGateGameTitle(null);
  }, []);

  return {
    accountOpen,
    accountInitialSection,
    accountInitialAuthMode,
    registrationGateGameTitle,
    openAccountModal,
    openRegistrationGate,
    closeAccountModal,
  };
}
