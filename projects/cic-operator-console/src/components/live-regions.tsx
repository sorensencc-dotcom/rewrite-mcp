/**
 * Live Regions & Async Events — Phase 3.6 Stream C
 *
 * Provides WCAG 2.1 AA compliant live regions for screen reader announcements.
 * Used to notify accessibility users of state changes without interrupting focus.
 *
 * Components:
 * - StatusLive: Generic polite status announcements (5s auto-clear)
 * - AlertLive: Critical alert announcements (no auto-clear, assertive)
 * - LogLive: Activity log display (polite, last N entries)
 * - useStatusAnnouncement: Hook to manage status announcements
 *
 * Integration:
 * - Import and render live region components in dashboard root
 * - Call announce() from panels when state changes occur
 * - Do not style; components are invisible to sighted users
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

/**
 * StatusLive — Generic polite status announcements
 * Auto-clears after 5 seconds.
 * Used for: Pipeline state changes, health recovered, agent completion
 */
export interface StatusLiveProps {
  message?: string;  // Current announcement (polite)
  className?: string;
}

export function StatusLive({ message, className = '' }: StatusLiveProps): JSX.Element {
  const [displayMessage, setDisplayMessage] = useState<string | null>(message || null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setDisplayMessage(message || null);

    // Auto-clear after 5 seconds
    if (message) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setDisplayMessage(null);
      }, 5000);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {displayMessage}
    </div>
  );
}

/**
 * AlertLive — Critical alert announcements (assertive)
 * Does NOT auto-clear.
 * Used for: Alert severity escalation, CRITICAL service issues
 */
export interface AlertLiveProps {
  message?: string;  // Current announcement (assertive)
  className?: string;
}

export function AlertLive({ message, className = '' }: AlertLiveProps): JSX.Element {
  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`sr-only ${className}`}
    >
      {message}
    </div>
  );
}

/**
 * LogLive — Activity log announcements
 * Displays last N entries (default 3) in polite live region.
 * Used for: Agent task completion, pipeline events, system logs
 */
export interface LogEntry {
  id: string;
  message: string;
  timestamp: string;
}

export interface LogLiveProps {
  entries?: LogEntry[];
  maxVisible?: number;  // Default 3
  className?: string;
}

export function LogLive({ entries = [], maxVisible = 3, className = '' }: LogLiveProps): JSX.Element {
  // Get the last N entries
  const visibleEntries = entries.slice(-maxVisible);

  return (
    <div
      role="log"
      aria-live="polite"
      className={`sr-only ${className}`}
    >
      {visibleEntries.map((entry) => (
        <div key={entry.id}>
          {entry.timestamp} — {entry.message}
        </div>
      ))}
    </div>
  );
}

/**
 * useStatusAnnouncement — Hook to manage status announcements
 * Returns { announce, message } for components to queue announcements.
 * Example: const { announce } = useStatusAnnouncement(); announce('Health check passed')
 */
export interface UseStatusAnnouncementReturn {
  announce: (message: string) => void;
  message: string | null;
}

export function useStatusAnnouncement(): UseStatusAnnouncementReturn {
  const [message, setMessage] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const announce = useCallback((newMessage: string) => {
    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set the message
    setMessage(newMessage);

    // Auto-clear after 5 seconds
    timeoutRef.current = setTimeout(() => {
      setMessage(null);
    }, 5000);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    announce,
    message,
  };
}

/**
 * AnnouncementContext — Context provider for sharing announcements across panels
 * Enables any panel component to call announce() without prop drilling
 */
export interface AnnouncementContextType {
  announce: (message: string) => void;
  statusMessage: string | null;
  alertMessage: string | null;
  setAlertMessage: (message: string | null) => void;
  logEntries: LogEntry[];
  addLogEntry: (message: string) => void;
}

export const AnnouncementContext = React.createContext<AnnouncementContextType | undefined>(undefined);

/**
 * AnnouncementProvider — Root-level provider for all announcement hooks
 * Wrap entire app or console section with this provider
 */
export interface AnnouncementProviderProps {
  children: React.ReactNode;
}

export function AnnouncementProvider({ children }: AnnouncementProviderProps): JSX.Element {
  const { announce, message: statusMessage } = useStatusAnnouncement();
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);

  const addLogEntry = useCallback((message: string) => {
    const entry: LogEntry = {
      id: `log-${Date.now()}-${Math.random()}`,
      message,
      timestamp: new Date().toLocaleTimeString(),
    };
    setLogEntries((prev) => [...prev, entry].slice(-50)); // Keep last 50 entries
  }, []);

  const value: AnnouncementContextType = {
    announce,
    statusMessage,
    alertMessage,
    setAlertMessage,
    logEntries,
    addLogEntry,
  };

  return (
    <AnnouncementContext.Provider value={value}>
      <StatusLive message={statusMessage ?? undefined} />
      <AlertLive message={alertMessage ?? undefined} />
      <LogLive entries={logEntries} maxVisible={3} />
      {children}
    </AnnouncementContext.Provider>
  );
}

/**
 * useAnnouncements — Hook to access announcement context
 * Use this from any panel component to call announce(), setAlertMessage(), addLogEntry()
 * Example:
 *   const { announce, setAlertMessage, addLogEntry } = useAnnouncements();
 *   announce('Health check passed');
 *   setAlertMessage('CRITICAL: Service down');
 *   addLogEntry('Pipeline completed');
 */
export function useAnnouncements(): AnnouncementContextType {
  const context = React.useContext(AnnouncementContext);
  if (!context) {
    throw new Error('useAnnouncements must be used within AnnouncementProvider');
  }
  return context;
}
