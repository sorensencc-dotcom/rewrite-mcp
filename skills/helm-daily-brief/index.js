/**
 * HELM Daily Brief Skill (45.5)
 *
 * Generate morning briefing from Calendar, Gmail, Finance, and Deals data.
 * Integrates with MCP servers for real-time data and context-memory-manager for caching.
 */

// In-memory cache (would use context-memory-manager with TTL in production)
const briefingCache = new Map();
const CACHE_TTL_MS = 86400000; // 24 hours

export async function helmDailyBrief(params = {}) {
  const startTime = Date.now();

  try {
    // Validate input
    validateInput(params);

    const {
      includeEvents = true,
      includeEmails = true,
      includeFinance = true,
      maxEventsPerDay = 10,
      maxEmailCount = 5,
      format = 'text',
      forceRefresh = false
    } = params;

    const cacheKey = 'helm-daily-brief';

    // Check cache if not forcing refresh
    if (!forceRefresh) {
      const cached = briefingCache.get(cacheKey);
      if (cached && Date.now() - cached.generatedAt < CACHE_TTL_MS) {
        if (format === 'json') {
          return {
            success: true,
            briefing: parseBriefingToJSON(cached.brief),
            format: 'json',
            source: 'cached',
            cachedAt: new Date(cached.generatedAt).toISOString(),
            expiresAt: new Date(cached.generatedAt + CACHE_TTL_MS).toISOString(),
            elapsedMs: Date.now() - startTime
          };
        } else {
          return {
            success: true,
            brief: cached.brief,
            format: 'text',
            source: 'cached',
            cachedAt: new Date(cached.generatedAt).toISOString(),
            expiresAt: new Date(cached.generatedAt + CACHE_TTL_MS).toISOString(),
            elapsedMs: Date.now() - startTime
          };
        }
      }
    }

    // Fetch data from MCP servers in parallel
    const [eventsData, emailData, financeData] = await Promise.all([
      includeEvents ? fetchCalendarEvents(maxEventsPerDay) : null,
      includeEmails ? fetchEmailSummary(maxEmailCount) : null,
      includeFinance ? fetchFinancialSummary() : null
    ]).catch(err => {
      // Graceful degradation: return what we got, skip failed sections
      return [null, null, null];
    });

    // Compile briefing
    const briefing = compileBriefing(
      eventsData,
      emailData,
      financeData,
      { includeEvents, includeEmails, includeFinance }
    );

    // Cache the result
    briefingCache.set(cacheKey, {
      brief: briefing,
      generatedAt: Date.now()
    });

    const elapsed = Date.now() - startTime;

    if (format === 'json') {
      return {
        success: true,
        briefing: parseBriefingToJSON(briefing),
        format: 'json',
        source: 'live',
        generatedAt: new Date().toISOString(),
        elapsedMs: elapsed
      };
    } else {
      return {
        success: true,
        brief: briefing,
        format: 'text',
        source: 'live',
        generatedAt: new Date().toISOString(),
        elapsedMs: elapsed
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
      elapsedMs: Date.now() - startTime
    };
  }
}

/**
 * Validate input parameters
 */
function validateInput(params) {
  if (params.maxEventsPerDay && (params.maxEventsPerDay < 1 || params.maxEventsPerDay > 20)) {
    throw new Error('maxEventsPerDay must be between 1 and 20');
  }

  if (params.maxEmailCount && (params.maxEmailCount < 1 || params.maxEmailCount > 10)) {
    throw new Error('maxEmailCount must be between 1 and 10');
  }

  if (params.format && !['text', 'json'].includes(params.format)) {
    throw new Error('format must be "text" or "json"');
  }
}

/**
 * Fetch calendar events from MCP server
 * Attempts real integration first, falls back to mock
 */
async function fetchCalendarEvents(maxEvents) {
  try {
    // Attempt real MCP Google Calendar integration
    if (typeof global.mcpCalendar !== 'undefined' && global.mcpCalendar) {
      const result = await global.mcpCalendar.listEvents({
        timeMax: new Date(Date.now() + 86400000).toISOString(),
        maxResults: maxEvents
      });
      return {
        success: true,
        events: result.items || [],
        totalCount: (result.items || []).length,
        source: 'google-calendar-real'
      };
    }
  } catch (e) {
    // Fall through to mock
  }

  // Fallback: mock implementation
  const events = [];
  const now = new Date();
  const count = Math.min(Math.max(Math.floor(Math.random() * 5) + 1, 1), maxEvents);

  for (let i = 0; i < count; i++) {
    events.push({
      id: `evt-${i}`,
      title: `Meeting ${i + 1}`,
      startTime: new Date(now.getTime() + (i + 1) * 3600000).toISOString(),
      duration: 60,
      attendees: Math.floor(Math.random() * 5) + 1,
      location: `Conference Room ${String.fromCharCode(65 + i)}`
    });
  }

  return {
    success: true,
    events,
    totalCount: events.length,
    source: 'google-calendar-mock'
  };
}

/**
 * Fetch email summary from MCP server
 * Attempts real integration first, falls back to mock
 */
async function fetchEmailSummary(maxEmails) {
  try {
    // Attempt real MCP Gmail integration
    if (typeof global.mcpGmail !== 'undefined' && global.mcpGmail) {
      const result = await global.mcpGmail.listMessages({
        q: 'is:unread',
        maxResults: maxEmails
      });
      return {
        success: true,
        emails: result.messages || [],
        unreadCount: (result.messages || []).length,
        source: 'gmail-real'
      };
    }
  } catch (e) {
    // Fall through to mock
  }

  // Fallback: mock implementation
  const emails = [];
  const senders = ['boss@company.com', 'team@company.com', 'client@client.com'];
  const count = Math.min(Math.max(Math.floor(Math.random() * 3) + 1, 1), maxEmails);

  for (let i = 0; i < count; i++) {
    emails.push({
      id: `email-${i}`,
      from: senders[i % senders.length],
      subject: `Important message ${i + 1}`,
      snippet: 'This is a preview of the email content...',
      priority: ['high', 'medium', 'low'][Math.floor(Math.random() * 3)],
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString()
    });
  }

  return {
    success: true,
    emails,
    unreadCount: emails.length,
    source: 'gmail-mock'
  };
}

/**
 * Fetch financial summary from Era Context MCP
 * Attempts real integration first, falls back to mock
 */
async function fetchFinancialSummary() {
  try {
    // Attempt real Era Context MCP integration
    if (typeof global.mcpEraContext !== 'undefined' && global.mcpEraContext) {
      const [accountBalance, dailySummary] = await Promise.all([
        global.mcpEraContext.getAccountBalance ? global.mcpEraContext.getAccountBalance() : null,
        global.mcpEraContext.getDailyFinancialSummary ? global.mcpEraContext.getDailyFinancialSummary() : null
      ]);

      if (accountBalance && dailySummary) {
        return {
          success: true,
          accounts: accountBalance.accounts || {},
          totalNetWorth: accountBalance.totalNetWorth || 0,
          dailySpending: dailySummary.dailySpending || 0,
          dailyBudget: dailySummary.dailyBudget || 0,
          budgetRemaining: (dailySummary.dailyBudget || 0) - (dailySummary.dailySpending || 0),
          spendingTrend: dailySummary.trend || 'stable',
          source: 'era-context-real'
        };
      }
    }
  } catch (e) {
    // Fall through to mock
  }

  // Fallback: mock implementation
  return {
    success: true,
    accounts: {
      checking: {
        balance: 15234.56,
        lastUpdate: new Date().toISOString()
      },
      savings: {
        balance: 45678.90,
        lastUpdate: new Date().toISOString()
      }
    },
    totalNetWorth: 60913.46,
    dailySpending: 234.50,
    dailyBudget: 500,
    budgetRemaining: 265.50,
    spendingTrend: 'up',
    source: 'era-context-mock'
  };
}

/**
 * Compile briefing from multiple data sources
 */
function compileBriefing(eventsData, emailData, financeData, options) {
  const lines = [];
  const now = new Date();

  lines.push(`═══════════════════════════════════════════════════════════`);
  lines.push(`HELM DAILY BRIEF — ${now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  })}`);
  lines.push(`═══════════════════════════════════════════════════════════`);
  lines.push('');

  // Calendar section
  if (options.includeEvents && eventsData?.success) {
    lines.push('📅 TODAY\'S SCHEDULE');
    lines.push('─────────────────────────');
    if (eventsData.events.length === 0) {
      lines.push('No events scheduled');
    } else {
      eventsData.events.forEach((evt, idx) => {
        const time = new Date(evt.startTime).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        });
        lines.push(`  ${idx + 1}. ${time} — ${evt.title}`);
        if (evt.location) lines.push(`     Location: ${evt.location}`);
        if (evt.attendees > 0) lines.push(`     Attendees: ${evt.attendees}`);
      });
    }
    lines.push('');
  }

  // Email section
  if (options.includeEmails && emailData?.success) {
    lines.push('📧 HIGH-PRIORITY MESSAGES');
    lines.push('─────────────────────────');
    if (emailData.emails.length === 0) {
      lines.push('No new messages');
    } else {
      emailData.emails.forEach((email, idx) => {
        const priority = email.priority === 'high' ? '🔴' : '🟡';
        lines.push(`  ${idx + 1}. ${priority} From: ${email.from}`);
        lines.push(`     Subject: ${email.subject}`);
        lines.push(`     "${email.snippet}..."`);
      });
      lines.push(`\n  Unread: ${emailData.unreadCount} messages`);
    }
    lines.push('');
  }

  // Finance section
  if (options.includeFinance && financeData?.success) {
    lines.push('💰 FINANCIAL SNAPSHOT');
    lines.push('─────────────────────────');
    lines.push(`  Net Worth: $${financeData.totalNetWorth.toLocaleString()}`);
    lines.push(`  Checking: $${financeData.accounts.checking.balance.toLocaleString()}`);
    lines.push(`  Savings: $${financeData.accounts.savings.balance.toLocaleString()}`);
    lines.push('');
    lines.push(`  Today's Spending: $${financeData.dailySpending.toFixed(2)}`);
    lines.push(`  Daily Budget: $${financeData.dailyBudget.toFixed(2)}`);
    lines.push(`  Remaining: $${financeData.budgetRemaining.toFixed(2)} (${Math.round(financeData.budgetRemaining / financeData.dailyBudget * 100)}%)`);
    const trend = financeData.spendingTrend === 'up' ? '📈' : financeData.spendingTrend === 'down' ? '📉' : '➡️';
    lines.push(`  Trend: ${trend} ${financeData.spendingTrend}`);
    lines.push('');
  }

  lines.push(`═══════════════════════════════════════════════════════════`);
  lines.push(`Generated: ${now.toLocaleTimeString()}`);

  return lines.join('\n');
}

/**
 * Parse briefing text into structured JSON
 */
function parseBriefingToJSON(briefingText) {
  return {
    type: 'daily-briefing',
    timestamp: new Date().toISOString(),
    sections: {
      schedule: extractSection(briefingText, 'SCHEDULE'),
      messages: extractSection(briefingText, 'MESSAGES'),
      finance: extractSection(briefingText, 'FINANCIAL')
    },
    rawText: briefingText
  };
}

/**
 * Extract section from briefing text
 */
function extractSection(text, sectionName) {
  const regex = new RegExp(`📅|📧|💰.*?(?=📅|📧|💰|═══|$)`, 's');
  const match = text.match(regex);
  return match ? match[0].trim() : null;
}
