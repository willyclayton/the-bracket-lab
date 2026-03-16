'use client';

import { SWRConfig } from 'swr';
import { ReactNode } from 'react';

export default function LiveResultsProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        revalidateOnFocus: true,
        revalidateIfStale: true,
      }}
    >
      {children}
    </SWRConfig>
  );
}
