'use client'

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IndexPage() {
  const router = useRouter();
  
  useEffect(() => {
    router.replace('/home');
  }, [router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">CraCha wird geladen...</h1>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
      </div>
    </div>
  );
}
