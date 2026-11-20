'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface FirebaseErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class FirebaseErrorBoundary extends React.Component<
  { children: React.ReactNode },
  FirebaseErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): FirebaseErrorBoundaryState {
    return {
      hasError: true,
      message: error?.message || 'An unexpected application error occurred.',
    };
  }

  override componentDidCatch(error: Error): void {
    console.error('Numbercraft ErrorBoundary caught:', error);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto my-12 max-w-lg rounded-2xl border border-[#E2DCCF] bg-white p-6 text-center shadow-md">
          <AlertTriangle
            className="mx-auto h-8 w-8 text-[#B45309]"
            aria-hidden="true"
          />
          <h2 className="mt-3 font-display text-xl font-semibold text-[#1C232B]">
            Something went wrong
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-[#5A6572]">
            {this.state.message}
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, message: '' })}
            className="btn-cobalt mt-4 inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
