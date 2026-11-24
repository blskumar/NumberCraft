'use client';

import type { AccountBodyProps } from './types';
import { useAccountActions } from './useAccountActions';
import { useAccountState } from './useAccountState';

/** AccountModal state plus its handlers, passed to every section component as one context object. */
export function useAccount(props: AccountBodyProps) {
  const state = useAccountState(props);
  return { ...state, ...useAccountActions(state) };
}

export type AccountCtx = ReturnType<typeof useAccount>;
