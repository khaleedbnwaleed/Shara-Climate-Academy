'use client';

import { AuthProvider, useAuth } from '@/context/auth-context';
import RemoveExtensionAttributes from '@/components/remove-extension-attrs';
import { useEffect, useState } from 'react';

function AuthLoader({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function ClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthLoader>{children}</AuthLoader>
      <RemoveExtensionAttributes />
    </AuthProvider>
  );
}
