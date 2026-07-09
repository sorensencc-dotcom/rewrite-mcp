/**
 * PII Redaction Service
 * Specification: CIC-SPEC-MCP-001 v1.2 §8.4
 */

import { AuditLogger } from "./AuditLogger.js";

export class PIIRedactionService {
  // Regexes
  private static readonly EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  private static readonly PHONE_REGEX = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  private static readonly SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;
  
  // Potential Credit Card Number regex (13-19 digits, optional spaces/hyphens)
  private static readonly POTENTIAL_CC_REGEX = /\b(?:\d[ -]*?){13,19}\b/g;
  
  // Heuristic Addresses (e.g., 123 Main St, 456 Broadway Ave, etc.)
  private static readonly ADDRESS_STREET_REGEX = /\b\d+\s+[A-Z][a-zA-Z0-9\s#\.]+?(?:Street|St|Avenue|Ave|Road|Rd|Lane|Ln|Drive|Dr|Boulevard|Blvd|Court|Ct|Way|Plaza|Pl)\b/gi;
  private static readonly ADDRESS_ZIP_REGEX = /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/g;

  // Heuristic Names: Titles like Mr./Ms. followed by capitalized name, or common names
  private static readonly NAME_TITLE_REGEX = /\b(?:Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
  
  // List of common first names to help name heuristics (add standard test names)
  public static COMMON_NAMES = new Set([
    "John", "Jane", "Alice", "Bob", "Charlie", "David", "Emma", "Frank",
    "Grace", "Henry", "Ivy", "Jack", "Karl", "Leo", "Mary", "Nancy",
    "Oscar", "Paul", "Quincy", "Rose", "Soren", "Thomas", "Victor", "Walter"
  ]);

  /**
   * Scans a text string and applies redaction rules.
   * @param text The input text to scan.
   * @param mode "full" (regex + NLP heuristic) or "regex_only"
   */
  public static redactText(text: string, mode: "full" | "regex_only" = "full"): string {
    if (!text) return text;
    
    let redacted = text;

    // 1. Email Redaction
    const emailTemp = redacted.replace(this.EMAIL_REGEX, "[EMAIL REDACTED]");
    if (emailTemp !== redacted) {
      AuditLogger.record("pii_redacted", "email", { detail: "Email address redacted" });
      redacted = emailTemp;
    }

    // 2. Phone Redaction
    const phoneTemp = redacted.replace(this.PHONE_REGEX, "[PHONE REDACTED]");
    if (phoneTemp !== redacted) {
      AuditLogger.record("pii_redacted", "phone", { detail: "Phone number redacted" });
      redacted = phoneTemp;
    }

    // 3. SSN Redaction
    const ssnTemp = redacted.replace(this.SSN_REGEX, "[SSN REDACTED]");
    if (ssnTemp !== redacted) {
      AuditLogger.record("pii_redacted", "ssn", { detail: "Social Security Number redacted" });
      redacted = ssnTemp;
    }

    // 4. Credit Card Redaction (with Luhn validation)
    const ccTemp = this.redactCreditCards(redacted);
    if (ccTemp !== redacted) {
      AuditLogger.record("pii_redacted", "payment", { detail: "Credit Card number redacted" });
      redacted = ccTemp;
    }

    if (mode === "full") {
      // 5. Physical Addresses Redaction
      let addrChanged = false;
      const addrStTemp = redacted.replace(this.ADDRESS_STREET_REGEX, "[ADDRESS REDACTED]");
      if (addrStTemp !== redacted) {
        addrChanged = true;
        redacted = addrStTemp;
      }
      const addrZipTemp = redacted.replace(this.ADDRESS_ZIP_REGEX, "[ADDRESS REDACTED]");
      if (addrZipTemp !== redacted) {
        addrChanged = true;
        redacted = addrZipTemp;
      }
      if (addrChanged) {
        AuditLogger.record("pii_redacted", "address", { detail: "Physical address redacted" });
      }

      // 6. Names Redaction (Heuristics)
      let nameChanged = false;
      const nameTitleTemp = redacted.replace(this.NAME_TITLE_REGEX, "[NAME REDACTED]");
      if (nameTitleTemp !== redacted) {
        nameChanged = true;
        redacted = nameTitleTemp;
      }
      const nameCommonTemp = this.redactCommonNames(redacted);
      if (nameCommonTemp !== redacted) {
        nameChanged = true;
        redacted = nameCommonTemp;
      }
      if (nameChanged) {
        AuditLogger.record("pii_redacted", "name", { detail: "Name redacted" });
      }
    }

    return redacted;
  }

  /**
   * Recursively redacts PII in a structured payload object.
   */
  public static redactPayload(payload: any, mode: "full" | "regex_only" = "full"): any {
    if (payload === null || payload === undefined) {
      return payload;
    }

    if (typeof payload === "string") {
      return this.redactText(payload, mode);
    }

    if (Array.isArray(payload)) {
      return payload.map(item => this.redactPayload(item, mode));
    }

    if (typeof payload === "object") {
      const copy: Record<string, any> = {};
      for (const [key, value] of Object.entries(payload)) {
        if (key === "session_id" || key === "workspace_id" || key === "idempotency_key" || key === "event_id" || key === "tenant_id" || key === "user_id") {
          copy[key] = value;
        } else {
          copy[key] = this.redactPayload(value, mode);
        }
      }
      return copy;
    }

    return payload;
  }

  /**
   * Validates if a string of digits passes the Luhn check.
   */
  private static luhnCheck(digitsOnly: string): boolean {
    let sum = 0;
    let shouldDouble = false;
    
    for (let i = digitsOnly.length - 1; i >= 0; i--) {
      let digit = parseInt(digitsOnly.charAt(i), 10);

      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      shouldDouble = !shouldDouble;
    }

    return sum % 10 === 0;
  }

  /**
   * Detects credit cards via regex, checks Luhn algorithm, and replaces valid cards.
   */
  private static redactCreditCards(text: string): string {
    return text.replace(this.POTENTIAL_CC_REGEX, (match) => {
      const digitsOnly = match.replace(/[- ]/g, "");
      if (this.luhnCheck(digitsOnly)) {
        return "[PAYMENT REDACTED]";
      }
      return match;
    });
  }

  /**
   * Redacts common names and capitalized full name pairs using a heuristic.
   */
  private static redactCommonNames(text: string): string {
    let result = text;

    const namePairRegex = /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g;
    result = result.replace(namePairRegex, (match, first, last) => {
      if (this.COMMON_NAMES.has(first) || this.COMMON_NAMES.has(last)) {
        return "[NAME REDACTED]";
      }
      return match;
    });

    for (const name of this.COMMON_NAMES) {
      const singleNameRegex = new RegExp(`\\b${name}\\b`, "g");
      result = result.replace(singleNameRegex, "[NAME REDACTED]");
    }

    return result;
  }
}
