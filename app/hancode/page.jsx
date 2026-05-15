"use client";
import React from 'react';
import HanCodeStudio from '@/components/HanCodeStudio';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function HanCodePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isMounted && status === 'unauthenticated') {
      router.push('/login');
    }
  }, [isMounted, status, router]);

  if (!isMounted || status === 'loading') {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%)',
        color: '#fff'
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading HAN Code...</h2>
          <p style={{ opacity: 0.7, marginTop: '16px' }}>Initializing your AI IDE</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: '#0f0f23', minHeight: '100vh', color: '#fff' }}>
      <HanCodeStudio user={session?.user} />
    </div>
  );
}
