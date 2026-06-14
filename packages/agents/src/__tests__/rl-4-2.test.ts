/* eslint-disable @typescript-eslint/no-explicit-any */
import { WcagValidator } from '../extractors/wcag-validator.js';
import { AccessibilityAuditor } from '../extractors/accessibility-auditor.js';
import type { DomModel } from '../extractors/dom.js';

describe('RL-4.2: WCAG 2.1 AA Accessibility Audit', () => {
  const accessibleDomModel: DomModel = {
    url: 'https://example.com/',
    title: 'Accessible Page',
    meta: { description: 'Test page', viewport: 'width=device-width', charset: 'utf-8' },
    root: {
      tag: 'html',
      classes: [],
      attributes: { lang: 'en' },
      children: [
        {
          tag: 'head',
          classes: [],
          attributes: {},
          children: [],
        },
        {
          tag: 'body',
          classes: [],
          attributes: {},
          children: [
            {
              tag: 'header',
              classes: [],
              attributes: {},
              children: [
                {
                  tag: 'h1',
                  classes: [],
                  attributes: {},
                  text: 'Welcome',
                  children: [],
                },
              ],
            },
            {
              tag: 'main',
              classes: [],
              attributes: {},
              children: [
                {
                  tag: 'h2',
                  classes: [],
                  attributes: {},
                  text: 'Content',
                  children: [],
                },
                {
                  tag: 'img',
                  classes: [],
                  attributes: { src: '/img.png', alt: 'Descriptive alt text' },
                  children: [],
                },
              ],
            },
            {
              tag: 'footer',
              classes: [],
              attributes: {},
              children: [],
            },
          ],
        },
      ],
    },
    headings: [
      { tag: 'h1', text: 'Welcome' },
      { tag: 'h2', text: 'Content' },
    ],
    images: [{ src: '/img.png', alt: 'Descriptive alt text' }],
    links: [],
    forms: [],
    extractedAt: new Date().toISOString(),
  };

  const inaccessibleDomModel: DomModel = {
    ...accessibleDomModel,
    title: '',
    root: {
      ...accessibleDomModel.root,
      attributes: {}, // Missing lang
      children: [
        {
          tag: 'head',
          classes: [],
          attributes: {},
          children: [],
        },
        {
          tag: 'body',
          classes: [],
          attributes: {},
          children: [
            {
              tag: 'div',
              classes: [],
              attributes: { onclick: 'doSomething()' },
              children: [
                {
                  tag: 'img',
                  classes: [],
                  attributes: { src: '/img.png' }, // Missing alt
                  children: [],
                },
              ],
            },
          ],
        },
      ],
    },
    headings: [],
    images: [{ src: '/img.png' }],
    links: [],
    forms: [],
    extractedAt: new Date().toISOString(),
  };

  describe('WcagValidator', () => {
    it('detects missing alt text on images', () => {
      const validator = new WcagValidator(inaccessibleDomModel);
      const result = validator.audit();

      const imageIssues = result.issuesFound.filter(i => i.id === '1.1.1');
      expect(imageIssues.length).toBeGreaterThan(0);
      expect(imageIssues[0].severity).toBe('critical');
    });

    it('detects missing page title', () => {
      const validator = new WcagValidator(inaccessibleDomModel);
      const result = validator.audit();

      const titleIssues = result.issuesFound.filter(i => i.id === '2.4.2');
      expect(titleIssues.length).toBeGreaterThan(0);
    });

    it('detects missing lang attribute', () => {
      const validator = new WcagValidator(inaccessibleDomModel);
      const result = validator.audit();

      const langIssues = result.issuesFound.filter(i => i.id === '3.1.1');
      expect(langIssues.length).toBeGreaterThan(0);
    });

    it('passes accessible page', () => {
      const validator = new WcagValidator(accessibleDomModel);
      const result = validator.audit();

      const criticalIssues = result.issuesFound.filter(i => i.severity === 'critical');
      expect(criticalIssues.length).toBe(0);
    });

    it('calculates contrast ratio', () => {
      const validator = new WcagValidator(accessibleDomModel);
      // @ts-expect-error private method
      const ratio = validator.calculateContrastRatio('#000000', '#ffffff');
      expect(ratio).toBeGreaterThan(4.5);
    });

    it('detects keyboard access issues', () => {
      const validator = new WcagValidator(inaccessibleDomModel);
      const result = validator.audit();

      const keyboardIssues = result.issuesFound.filter(i => i.id === '2.1.1');
      expect(keyboardIssues.length).toBeGreaterThan(0);
    });

    it('reports score', () => {
      const validator = new WcagValidator(accessibleDomModel);
      const result = validator.audit();

      expect(result.score).toBeGreaterThan(80);
    });

    it('conformance status reflects issue severity', () => {
      const accessValidator = new WcagValidator(accessibleDomModel);
      const accessResult = accessValidator.audit();
      expect(accessResult.conformance).toBe('pass');

      const inaccessValidator = new WcagValidator(inaccessibleDomModel);
      const inaccessResult = inaccessValidator.audit();
      expect(['fail', 'partial']).toContain(inaccessResult.conformance);
    });
  });

  describe('AccessibilityAuditor', () => {
    it('runs full audit and returns report', () => {
      const auditor = new AccessibilityAuditor();
      const report = auditor.audit(accessibleDomModel);

      expect(report.url).toBe(accessibleDomModel.url);
      expect(report.wcagResult).toBeTruthy();
      expect(report.recommendations).toBeDefined();
      expect(report.prioritizedFixes).toBeDefined();
      expect(report.overallAccessibilityScore).toBeGreaterThan(0);
    });

    it('detects semantic HTML usage', () => {
      const auditor = new AccessibilityAuditor();
      const report = auditor.audit(accessibleDomModel);

      // Accessible model has headings, landmarks, good structure
      expect(report.overallAccessibilityScore).toBeGreaterThan(60);
    });

    it('penalizes inaccessible pages', () => {
      const auditor = new AccessibilityAuditor();
      const report = auditor.audit(inaccessibleDomModel);

      expect(report.wcagResult.conformance).not.toBe('pass');
      expect(report.prioritizedFixes.length).toBeGreaterThan(0);
    });

    it('generates actionable recommendations', () => {
      const auditor = new AccessibilityAuditor();
      const report = auditor.audit(inaccessibleDomModel);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations[0].length).toBeGreaterThan(0);
    });

    it('prioritizes critical issues first', () => {
      const auditor = new AccessibilityAuditor();
      const report = auditor.audit(inaccessibleDomModel);

      if (report.prioritizedFixes.length > 0) {
        expect(report.prioritizedFixes[0].priority).toBe('critical');
      }
    });

    it('calculates accessibility score', () => {
      const auditor = new AccessibilityAuditor();
      const accessReport = auditor.audit(accessibleDomModel);
      const inaccessReport = auditor.audit(inaccessibleDomModel);

      expect(accessReport.overallAccessibilityScore).toBeGreaterThan(inaccessReport.overallAccessibilityScore);
    });

    it('targets AA by default', () => {
      const auditor = new AccessibilityAuditor();
      const report = auditor.audit(accessibleDomModel);

      expect(report.wcagResult.targetLevel).toBe('AA');
    });

    it('supports different WCAG levels', () => {
      const auditor = new AccessibilityAuditor();
      const reportAA = auditor.audit(accessibleDomModel, undefined, 'AA');
      const reportAAA = auditor.audit(accessibleDomModel, undefined, 'AAA');

      expect(reportAA.wcagResult.targetLevel).toBe('AA');
      expect(reportAAA.wcagResult.targetLevel).toBe('AAA');
    });
  });

  describe('Integration: DOM + Computed Styles + WCAG', () => {
    it('combines DOM analysis with computed styles for contrast checking', () => {
      const computedStyles = [
        {
          selector: 'body',
          computed: { color: '#000000', 'background-color': '#ffffff' },
        },
        {
          selector: 'p',
          computed: { color: '#666666', 'background-color': '#ffffff' },
        },
      ];

      const auditor = new AccessibilityAuditor();
      const report = auditor.audit(accessibleDomModel, computedStyles as any);

      expect(report.wcagResult).toBeTruthy();
      // Contrast should be sufficient for these colors
      const contrastIssues = report.wcagResult.issuesFound.filter(i => i.id === '1.4.3');
      expect(contrastIssues.length).toBe(0);
    });

    it('reports insufficient contrast', () => {
      const computedStyles = [
        {
          selector: 'low-contrast',
          computed: { color: '#cccccc', 'background-color': '#ffffff' },
        },
      ];

      const auditor = new AccessibilityAuditor();
      const report = auditor.audit(accessibleDomModel, computedStyles as any);

      const contrastIssues = report.wcagResult.issuesFound.filter(i => i.id === '1.4.3');
      expect(contrastIssues.length).toBeGreaterThan(0);
    });
  });
});
