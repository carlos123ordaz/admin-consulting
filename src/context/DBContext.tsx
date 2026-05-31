import { createContext, useContext, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAll } from '../lib/api';
import type { DB } from '../types';

const DBCtx = createContext<DB | null>(null);

export function useDB(): DB {
  const ctx = useContext(DBCtx);
  if (!ctx) throw new Error('useDB must be used within DBProvider');
  return ctx;
}

export function useDBClient() {
  return useQueryClient();
}

export function invalidateDB(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ['db'] });
}

export function DBProvider({ children }: { children: ReactNode }) {
  const { data: db, isLoading, error } = useQuery({
    queryKey: ['db'],
    queryFn: fetchAll,
    staleTime: 30_000,
  });

  if (isLoading || !db) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'var(--font)', background: 'var(--bg)',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="brand-mark" style={{ margin: '0 auto 14px', fontSize: 22, width: 48, height: 48, borderRadius: 13 }}>H</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', fontWeight: 600 }}>Cargando panel…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'var(--font)', flexDirection: 'column', gap: 12,
      }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>Error al conectar con Supabase</div>
        <div style={{ fontSize: 13, color: 'var(--ink-3)' }}>Verifica las variables de entorno en <code>.env</code></div>
      </div>
    );
  }

  return <DBCtx.Provider value={db}>{children}</DBCtx.Provider>;
}
