import { Suspense } from 'react';
import FirebaseErrorBoundary from '@/components/FirebaseErrorBoundary';
import NumbercraftApp from '@/components/NumbercraftApp';

export default function HomePage() {
  return (
    <FirebaseErrorBoundary>
      <Suspense
        fallback={
          <div className="paper-grid flex min-h-screen items-center justify-center text-sm text-[#5A6572]">
            Loading Numbercraft Studio…
          </div>
        }
      >
        <NumbercraftApp />
      </Suspense>
    </FirebaseErrorBoundary>
  );
}
