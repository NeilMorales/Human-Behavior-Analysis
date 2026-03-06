'use client';

import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-violet/10 rounded-full blur-3xl" />

      <div className="relative z-10 text-center max-w-2xl">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <span className="text-accent-cyan text-4xl font-bold">[BQ]</span>
          <h1 className="text-4xl font-bold text-white">BehaviorIQ</h1>
        </div>

        {/* Tagline */}
        <p className="text-xl text-text-secondary mb-4">
          Understand your focus. Track your browser behavior. Own your productivity.
        </p>
        <p className="text-text-muted mb-12">
          An intelligent Chrome extension + Dashboard for analyzing your work patterns, focus sessions, and browsing habits.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/signup"
            className="px-8 py-3 bg-accent-cyan text-bg-primary font-semibold rounded-lg hover:bg-accent-cyan/90 transition-colors text-center"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3 border border-border text-text-primary font-semibold rounded-lg hover:bg-bg-tertiary transition-colors text-center"
          >
            Sign In
          </Link>
        </div>

        {/* Feature pills */}
        <div className="mt-16 flex flex-wrap gap-3 justify-center">
          {['Focus Sessions', 'Tab Tracking', 'Behavior Score', 'Smart Insights', 'Dark Mode', 'Chrome Extension'].map(feature => (
            <span key={feature} className="px-4 py-1.5 bg-bg-secondary border border-border rounded-full text-sm text-text-secondary">
              {feature}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
