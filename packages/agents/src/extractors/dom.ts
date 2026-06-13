import { parse as parseHtmlDoc, type HTMLElement as NHPElement } from 'node-html-parser';
import type { CrawlResult } from '../crawler/index.js';

export interface DomNode {
  tag: string;
  id?: string;
  classes: string[];
  attributes: Record<string, string>;
  children: DomNode[];
  text?: string;
}

export interface DomModel {
  url: string;
  title: string;
  meta: {
    description?: string;
    viewport?: string;
    charset?: string;
  };
  root: DomNode;
  headings: { tag: string; text: string }[];
  images: { src: string; alt?: string }[];
  links: { href: string; text: string }[];
  forms: { id?: string; action?: string; method?: string; fields: number }[];
  extractedAt: string;
}

export interface ExtractorOptions {
  maxDepth?: number;
  captureImages?: boolean;
  captureLinks?: boolean;
  captureForms?: boolean;
}

export class DomExtractor {
  private readonly maxDepth: number;
  private readonly captureImages: boolean;
  private readonly captureLinks: boolean;
  private readonly captureForms: boolean;

  constructor(options: ExtractorOptions = {}) {
    this.maxDepth = options.maxDepth ?? 20;
    this.captureImages = options.captureImages ?? true;
    this.captureLinks = options.captureLinks ?? true;
    this.captureForms = options.captureForms ?? true;
  }

  /**
   * Extract DOM model from crawl result HTML.
   * Returns parsed DOM tree, metadata, and extracted elements.
   */
  extract(crawl: CrawlResult): DomModel | null {
    if (!crawl.rawHtml) return null;

    const doc = parseHtmlDoc(crawl.rawHtml, { lowerCaseTagName: true, comment: false });
    const headings = this.extractHeadings(doc);
    const images = this.captureImages ? this.extractImages(doc) : [];
    const links = this.captureLinks ? this.extractLinks(doc) : [];
    const forms = this.captureForms ? this.extractForms(doc) : [];

    const htmlEl = doc.querySelector('html') ?? doc;
    const root = this.buildDomTree(htmlEl, 0);
    const title = doc.querySelector('title')?.text ?? '';
    const description = doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? undefined;
    const viewport = doc.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? undefined;
    const charset = doc.querySelector('meta[charset]')?.getAttribute('charset') ?? undefined;

    return {
      url: crawl.url,
      title: title.trim(),
      meta: { description, viewport, charset },
      root,
      headings,
      images,
      links,
      forms,
      extractedAt: new Date().toISOString(),
    };
  }

  private buildDomTree(element: NHPElement, depth: number): DomNode {
    if (depth > this.maxDepth) {
      return { tag: element.tagName?.toLowerCase() ?? 'unknown', classes: [], attributes: {}, children: [] };
    }

    const tag = element.tagName?.toLowerCase() ?? 'unknown';
    const id = element.getAttribute('id') ?? undefined;
    const classes = (element.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
    const attributes = this.captureAttributes(element);
    const childNodes = element.childNodes;
    const text = childNodes.length === 1 && childNodes[0].nodeType === 3
      ? childNodes[0].text.trim()
      : undefined;

    const children = element.childNodes
      .filter(n => n.nodeType === 1)
      .map(n => this.buildDomTree(n as NHPElement, depth + 1));

    return { tag, id, classes, attributes, children, text };
  }

  private captureAttributes(element: NHPElement): Record<string, string> {
    const attrs: Record<string, string> = {};
    const sensitive = ['password', 'token', 'secret', 'key'];
    const rawAttrs = element.attributes ?? {};

    for (const [name, value] of Object.entries(rawAttrs)) {
      if (!sensitive.some(s => name.toLowerCase().includes(s))) {
        attrs[name] = value;
      }
    }
    return attrs;
  }

  private extractHeadings(doc: NHPElement): { tag: string; text: string }[] {
    return doc.querySelectorAll('h1,h2,h3,h4,h5,h6').map(el => ({
      tag: el.tagName.toLowerCase(),
      text: el.text.trim(),
    }));
  }

  private extractImages(doc: NHPElement): { src: string; alt?: string }[] {
    return doc.querySelectorAll('img')
      .map(img => ({ src: img.getAttribute('src') ?? '', alt: img.getAttribute('alt') ?? undefined }))
      .filter(img => img.src);
  }

  private extractLinks(doc: NHPElement): { href: string; text: string }[] {
    return doc.querySelectorAll('a')
      .map(a => ({ href: a.getAttribute('href') ?? '', text: a.text.trim() }))
      .filter(l => l.href);
  }

  private extractForms(doc: NHPElement): { id?: string; action?: string; method?: string; fields: number }[] {
    return doc.querySelectorAll('form').map(form => ({
      id: form.getAttribute('id') ?? undefined,
      action: form.getAttribute('action') ?? undefined,
      method: form.getAttribute('method') ?? undefined,
      fields: form.querySelectorAll('input,textarea,select').length,
    }));
  }
}
