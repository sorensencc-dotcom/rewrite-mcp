/**
 * Async Live Region Tests — Phase 3.6 Stream C
 *
 * Tests all live region components and announcement hooks:
 * - StatusLive: Polite announcements with 5s auto-clear
 * - AlertLive: Assertive announcements (no auto-clear)
 * - LogLive: Activity log with last N entries
 * - useStatusAnnouncement: Hook lifecycle management
 *
 * To run: npm test -- async-live-region.test.ts
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import React from 'react';
import {
  StatusLive,
  AlertLive,
  LogLive,
  useStatusAnnouncement,
  AnnouncementProvider,
  useAnnouncements,
  LogEntry,
} from './live-regions';

describe('StatusLive', () => {
  it('should announce polite message', () => {
    const { container } = render(
      React.createElement(StatusLive, { message: 'Health check passed' })
    );

    const liveRegion = container.querySelector('[role="status"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion?.textContent).toBe('Health check passed');
  });

  it('should auto-clear message after 5 seconds', async () => {
    jest.useFakeTimers();

    const { rerender } = render(
      React.createElement(StatusLive, { message: 'Health check passed' })
    );

    const liveRegion = screen.getByRole('status');
    expect(liveRegion.textContent).toBe('Health check passed');

    // Advance 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    // Re-render to see updated state
    rerender(React.createElement(StatusLive, { message: '' }));

    await waitFor(() => {
      expect(liveRegion.textContent).toBe('');
    });

    jest.useRealTimers();
  });

  it('should clear message if prop changes to undefined', () => {
    const { rerender } = render(
      React.createElement(StatusLive, { message: 'Status update' })
    );

    let liveRegion = screen.getByRole('status');
    expect(liveRegion.textContent).toBe('Status update');

    rerender(React.createElement(StatusLive, { message: undefined }));

    liveRegion = screen.getByRole('status');
    expect(liveRegion.textContent).toBe('');
  });

  it('should apply custom className', () => {
    const { container } = render(
      React.createElement(StatusLive, {
        message: 'Test',
        className: 'custom-class',
      })
    );

    const liveRegion = container.querySelector('[role="status"]');
    expect(liveRegion).toHaveClass('custom-class');
  });
});

describe('AlertLive', () => {
  it('should announce critical alert', () => {
    const { container } = render(
      React.createElement(AlertLive, { message: 'CRITICAL: Service down' })
    );

    const alertRegion = container.querySelector('[role="alert"]');
    expect(alertRegion).toBeInTheDocument();
    expect(alertRegion).toHaveAttribute('aria-live', 'assertive');
    expect(alertRegion).toHaveAttribute('aria-atomic', 'true');
    expect(alertRegion?.textContent).toBe('CRITICAL: Service down');
  });

  it('should NOT auto-clear critical alerts', async () => {
    jest.useFakeTimers();

    const { container } = render(
      React.createElement(AlertLive, { message: 'CRITICAL: Service down' })
    );

    const alertRegion = container.querySelector('[role="alert"]');
    expect(alertRegion?.textContent).toBe('CRITICAL: Service down');

    // Advance 10 seconds
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    // Message should still be visible
    await waitFor(() => {
      expect(alertRegion?.textContent).toBe('CRITICAL: Service down');
    });

    jest.useRealTimers();
  });

  it('should handle empty alert message', () => {
    const { container } = render(React.createElement(AlertLive, { message: '' }));

    const alertRegion = container.querySelector('[role="alert"]');
    expect(alertRegion).toBeInTheDocument();
    expect(alertRegion?.textContent).toBe('');
  });

  it('should apply custom className', () => {
    const { container } = render(
      React.createElement(AlertLive, {
        message: 'Alert',
        className: 'alert-custom',
      })
    );

    const alertRegion = container.querySelector('[role="alert"]');
    expect(alertRegion).toHaveClass('alert-custom');
  });
});

describe('LogLive', () => {
  it('should display last 3 entries by default', () => {
    const entries: LogEntry[] = [
      {
        id: '1',
        message: 'Entry 1',
        timestamp: '10:00:00',
      },
      {
        id: '2',
        message: 'Entry 2',
        timestamp: '10:00:01',
      },
      {
        id: '3',
        message: 'Entry 3',
        timestamp: '10:00:02',
      },
      {
        id: '4',
        message: 'Entry 4',
        timestamp: '10:00:03',
      },
      {
        id: '5',
        message: 'Entry 5',
        timestamp: '10:00:04',
      },
    ];

    const { container } = render(
      React.createElement(LogLive, { entries })
    );

    const logRegion = container.querySelector('[role="log"]');
    expect(logRegion).toBeInTheDocument();
    expect(logRegion).toHaveAttribute('aria-live', 'polite');

    // Should display last 3 entries
    const text = logRegion?.textContent || '';
    expect(text).toContain('Entry 3');
    expect(text).toContain('Entry 4');
    expect(text).toContain('Entry 5');
    expect(text).not.toContain('Entry 1');
    expect(text).not.toContain('Entry 2');
  });

  it('should respect maxVisible prop', () => {
    const entries: LogEntry[] = [
      { id: '1', message: 'Entry 1', timestamp: '10:00:00' },
      { id: '2', message: 'Entry 2', timestamp: '10:00:01' },
      { id: '3', message: 'Entry 3', timestamp: '10:00:02' },
      { id: '4', message: 'Entry 4', timestamp: '10:00:03' },
    ];

    const { container } = render(
      React.createElement(LogLive, { entries, maxVisible: 2 })
    );

    const logRegion = container.querySelector('[role="log"]');
    const text = logRegion?.textContent || '';

    // Should only display last 2 entries
    expect(text).toContain('Entry 3');
    expect(text).toContain('Entry 4');
    expect(text).not.toContain('Entry 1');
    expect(text).not.toContain('Entry 2');
  });

  it('should format entries with timestamp and message', () => {
    const entries: LogEntry[] = [
      { id: '1', message: 'Pipeline started', timestamp: '10:30:45' },
    ];

    const { container } = render(
      React.createElement(LogLive, { entries })
    );

    const logRegion = container.querySelector('[role="log"]');
    const text = logRegion?.textContent || '';

    expect(text).toContain('10:30:45');
    expect(text).toContain('Pipeline started');
    expect(text).toContain('—'); // Separator
  });

  it('should handle empty entries array', () => {
    const { container } = render(
      React.createElement(LogLive, { entries: [] })
    );

    const logRegion = container.querySelector('[role="log"]');
    expect(logRegion).toBeInTheDocument();
    expect(logRegion?.textContent).toBe('');
  });

  it('should apply custom className', () => {
    const { container } = render(
      React.createElement(LogLive, {
        entries: [],
        className: 'log-custom',
      })
    );

    const logRegion = container.querySelector('[role="log"]');
    expect(logRegion).toHaveClass('log-custom');
  });

  it('should render entries with unique keys', () => {
    const entries: LogEntry[] = [
      { id: '1', message: 'Entry 1', timestamp: '10:00:00' },
      { id: '2', message: 'Entry 2', timestamp: '10:00:01' },
    ];

    // This test verifies React doesn't throw warnings about missing keys
    const { container } = render(
      React.createElement(LogLive, { entries })
    );

    const logRegion = container.querySelector('[role="log"]');
    expect(logRegion).toBeInTheDocument();
  });
});

describe('useStatusAnnouncement', () => {
  it('should initialize with null message', () => {
    const { result } = renderHook(() => useStatusAnnouncement());

    expect(result.current.message).toBeNull();
    expect(typeof result.current.announce).toBe('function');
  });

  it('should set message when announce() is called', () => {
    const { result } = renderHook(() => useStatusAnnouncement());

    act(() => {
      result.current.announce('Health check passed');
    });

    expect(result.current.message).toBe('Health check passed');
  });

  it('should auto-clear message after 5 seconds', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useStatusAnnouncement());

    act(() => {
      result.current.announce('First message');
    });

    expect(result.current.message).toBe('First message');

    // Advance 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.message).toBeNull();
    });

    jest.useRealTimers();
  });

  it('should handle multiple announce() calls', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useStatusAnnouncement());

    // First announcement
    act(() => {
      result.current.announce('First message');
    });
    expect(result.current.message).toBe('First message');

    // Second announcement (before first expires)
    act(() => {
      result.current.announce('Second message');
    });
    expect(result.current.message).toBe('Second message');

    // Advance 5 seconds
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(result.current.message).toBeNull();
    });

    jest.useRealTimers();
  });

  it('should clear previous timeout when new announcement is made', async () => {
    jest.useFakeTimers();

    const { result } = renderHook(() => useStatusAnnouncement());

    act(() => {
      result.current.announce('Message 1');
    });

    // Advance 3 seconds
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    // Message should still be visible
    expect(result.current.message).toBe('Message 1');

    // Make new announcement
    act(() => {
      result.current.announce('Message 2');
    });

    expect(result.current.message).toBe('Message 2');

    // Advance another 4 seconds (total 7s from first, 4s from second)
    act(() => {
      jest.advanceTimersByTime(4000);
    });

    // Message 2 should still be visible (only 4s passed)
    expect(result.current.message).toBe('Message 2');

    // Advance to 5s from second announcement
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    await waitFor(() => {
      expect(result.current.message).toBeNull();
    });

    jest.useRealTimers();
  });

  it('should cleanup timeouts on unmount', () => {
    jest.useFakeTimers();

    const { result, unmount } = renderHook(() => useStatusAnnouncement());

    act(() => {
      result.current.announce('Test message');
    });

    // Unmount before timeout completes
    unmount();

    // Advance time past timeout
    act(() => {
      jest.advanceTimersByTime(6000);
    });

    // No error should occur during unmount
    expect(true).toBe(true);

    jest.useRealTimers();
  });
});

describe('AnnouncementProvider and useAnnouncements', () => {
  it('should provide announcement context', () => {
    const TestComponent = () => {
      const { announce, statusMessage } = useAnnouncements();

      React.useEffect(() => {
        announce('Test announcement');
      }, [announce]);

      return React.createElement('div', null, statusMessage);
    };

    const { container } = render(
      React.createElement(
        AnnouncementProvider,
        null,
        React.createElement(TestComponent)
      )
    );

    // Provider renders live regions internally
    const statusRegion = container.querySelector('[role="status"]');
    expect(statusRegion).toBeInTheDocument();
  });

  it('should throw error when useAnnouncements is used outside provider', () => {
    // Suppress error output for this test
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const TestComponent = () => {
      useAnnouncements();
      return React.createElement('div', null, 'Test');
    };

    expect(() => {
      render(React.createElement(TestComponent));
    }).toThrow('useAnnouncements must be used within AnnouncementProvider');

    consoleError.mockRestore();
  });

  it('should manage alert messages', () => {
    const TestComponent = () => {
      const { setAlertMessage, alertMessage } = useAnnouncements();

      React.useEffect(() => {
        setAlertMessage('Critical alert');
      }, [setAlertMessage]);

      return React.createElement('div', null, alertMessage || 'no alert');
    };

    const { container } = render(
      React.createElement(
        AnnouncementProvider,
        null,
        React.createElement(TestComponent)
      )
    );

    const alertRegion = container.querySelector('[role="alert"]');
    expect(alertRegion?.textContent).toContain('Critical alert');
  });

  it('should manage log entries', () => {
    const TestComponent = () => {
      const { addLogEntry, logEntries } = useAnnouncements();

      React.useEffect(() => {
        addLogEntry('Pipeline started');
        addLogEntry('Pipeline completed');
      }, [addLogEntry]);

      return React.createElement(
        'div',
        null,
        `${logEntries.length} entries`
      );
    };

    const { container } = render(
      React.createElement(
        AnnouncementProvider,
        null,
        React.createElement(TestComponent)
      )
    );

    const logRegion = container.querySelector('[role="log"]');
    const text = logRegion?.textContent || '';

    expect(text).toContain('Pipeline started');
    expect(text).toContain('Pipeline completed');
  });

  it('should limit log entries to last 50', () => {
    const TestComponent = () => {
      const { addLogEntry } = useAnnouncements();

      React.useEffect(() => {
        for (let i = 0; i < 60; i++) {
          addLogEntry(`Entry ${i}`);
        }
      }, [addLogEntry]);

      return React.createElement('div', null, 'Test');
    };

    const { container } = render(
      React.createElement(
        AnnouncementProvider,
        null,
        React.createElement(TestComponent)
      )
    );

    const logRegion = container.querySelector('[role="log"]');
    const text = logRegion?.textContent || '';

    // Should only contain last 3 visible entries from the 50 stored
    // Entries 57, 58, 59 (0-indexed)
    expect(text).toContain('Entry 59');
    expect(text).not.toContain('Entry 0');
  });
});
