const fs = require('fs');
const path = require('path');

class ExceptionManager {
  constructor(registryPath = 'SKILLS_EXCEPTIONS.md') {
    this.registryPath = registryPath;
    this.exceptions = [];
    this.load();
  }

  load() {
    if (fs.existsSync(this.registryPath)) {
      const content = fs.readFileSync(this.registryPath, 'utf-8');
      this.exceptions = this._parseRegistry(content);
    }
  }

  save() {
    const content = this._generateRegistry();
    fs.writeFileSync(this.registryPath, content, 'utf-8');
  }

  hasException(skillName) {
    return this.exceptions.some(e => e.name === skillName);
  }

  getException(skillName) {
    return this.exceptions.find(e => e.name === skillName);
  }

  addException(data) {
    if (!data.name || !data.reason || !data.approvedBy || !data.date || !data.reviewUrl) {
      throw new Error('Exception requires: name, reason, approvedBy, date, reviewUrl');
    }

    const exception = {
      name: data.name,
      reason: data.reason,
      approvedBy: data.approvedBy,
      date: data.date,
      reviewUrl: data.reviewUrl,
      sunsetDate: data.sunsetDate || 'never'
    };

    if (!this.hasException(data.name)) {
      this.exceptions.push(exception);
      this.exceptions.sort((a, b) => a.name.localeCompare(b.name));
    }

    return exception;
  }

  removeException(skillName) {
    this.exceptions = this.exceptions.filter(e => e.name !== skillName);
  }

  list() {
    return [...this.exceptions];
  }

  getSunsetAlerts() {
    const today = new Date();
    return this.exceptions
      .filter(e => e.sunsetDate !== 'never')
      .map(e => {
        const sunsetDate = new Date(e.sunsetDate);
        const daysUntilSunset = Math.floor(
          (sunsetDate - today) / (1000 * 60 * 60 * 24)
        );
        return {
          name: e.name,
          sunsetDate: e.sunsetDate,
          daysUntilSunset,
          isExpired: daysUntilSunset < 0,
          dueSoon: daysUntilSunset >= 0 && daysUntilSunset <= 30
        };
      });
  }

  _parseRegistry(content) {
    const exceptions = [];
    const blocks = content.split(/###\s+Skill:\s+/);

    blocks.slice(1).forEach(block => {
      const lines = block.split('\n');
      const name = lines[0].trim();

      const exception = {
        name,
        reason: this._extractField(block, 'Reason'),
        approvedBy: this._extractField(block, 'Approved By'),
        date: this._extractField(block, 'Date'),
        reviewUrl: this._extractField(block, 'Review URL'),
        sunsetDate: this._extractField(block, 'Sunset Date') || 'never'
      };

      if (exception.name && exception.reason) {
        exceptions.push(exception);
      }
    });

    return exceptions;
  }

  _extractField(text, fieldName) {
    const regex = new RegExp(`-\\s+\\*\\*${fieldName}:\\*\\*\\s+(.+?)(?=\\n|$)`);
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  _generateRegistry() {
    const header = `# Skills Exceptions Registry

When a skill fails policy evaluation but is still valuable as CLI-native, it's registered here.

## Exception Entry Format

\`\`\`
### Skill: {name}
- **Reason:** {why it's CLI-specific}
- **Approved By:** {reviewer GitHub handle}
- **Date:** {YYYY-MM-DD}
- **Review URL:** {PR or issue link}
- **Sunset Date:** {YYYY-MM-DD or "never"}
\`\`\`

## Active Exceptions

`;

    const entries = this.exceptions
      .map(e => {
        return `### Skill: ${e.name}
- **Reason:** ${e.reason}
- **Approved By:** ${e.approvedBy}
- **Date:** ${e.date}
- **Review URL:** ${e.reviewUrl}
- **Sunset Date:** ${e.sunsetDate}
`;
      })
      .join('\n');

    return header + entries;
  }
}

module.exports = ExceptionManager;
