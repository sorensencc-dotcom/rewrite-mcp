import { applyDomPatch } from '../dom-patch/index.js';
import type { EditOp } from '../dom-patch/index.js';

describe('DOMPatch Engine', () => {
  const mockHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page</title>
      </head>
      <body>
        <div id="container">
          <h1 class="title">Hello World</h1>
          <p class="description">This is a paragraph.</p>
          <div class="box">Box 1</div>
          <div class="box">Box 2</div>
        </div>
      </body>
    </html>
  `;

  it('applies ColorChange with cssVar correctly', () => {
    const ops: EditOp[] = [
      {
        id: '1',
        type: 'ColorChange',
        selector: '.title',
        value: '#ff0000',
        cssVar: '--title-bg'
      }
    ];

    const result = applyDomPatch(mockHtml, {}, ops);

    expect(result.cssVars['--title-bg']).toBe('#ff0000');
    expect(result.changedSelectors).toContain('.title');
    expect(result.rawPatch).toContain(':root { --title-bg: #ff0000; }');
    expect(result.html).toContain('id="rl-root-vars"');
    expect(result.html).toContain('--title-bg: #ff0000;');
    expect(result.html).toContain('style="background: #ff0000;"');
  });

  it('applies ColorChange without cssVar correctly', () => {
    const ops: EditOp[] = [
      {
        id: '2',
        type: 'ColorChange',
        selector: '.description',
        value: '#00ff00'
      }
    ];

    const result = applyDomPatch(mockHtml, {}, ops);

    expect(result.changedSelectors).toContain('.description');
    expect(result.rawPatch).toContain('.description { background: #00ff00 !important; }');
    expect(result.html).toContain('id="rl-patch-styles"');
    expect(result.html).toContain('background: #00ff00 !important;');
    expect(result.html).toContain('style="background: #00ff00;"');
  });

  it('applies TypographyUpdate with cssVar correctly', () => {
    const ops: EditOp[] = [
      {
        id: '3',
        type: 'TypographyUpdate',
        selector: '.title',
        value: '2rem',
        cssVar: '--title-font-size'
      }
    ];

    const result = applyDomPatch(mockHtml, {}, ops);

    expect(result.cssVars['--title-font-size']).toBe('2rem');
    expect(result.changedSelectors).toContain('.title');
    expect(result.rawPatch).toContain(':root { --title-font-size: 2rem; }');
    expect(result.html).toContain('--title-font-size: 2rem;');
    expect(result.html).toContain('style="font-size: 2rem;"');
  });

  it('applies TypographyUpdate without cssVar correctly', () => {
    const ops: EditOp[] = [
      {
        id: '4',
        type: 'TypographyUpdate',
        selector: '.description',
        value: '14px'
      }
    ];

    const result = applyDomPatch(mockHtml, {}, ops);

    expect(result.changedSelectors).toContain('.description');
    expect(result.rawPatch).toContain('.description { font-size: 14px !important; }');
    expect(result.html).toContain('font-size: 14px !important;');
    expect(result.html).toContain('style="font-size: 14px;"');
  });

  it('applies LayoutShift correctly', () => {
    const ops: EditOp[] = [
      {
        id: '5',
        type: 'LayoutShift',
        selector: '.box',
        attributes: {
          display: 'flex',
          'margin-top': '10px'
        }
      }
    ];

    const result = applyDomPatch(mockHtml, {}, ops);

    expect(result.changedSelectors).toContain('.box');
    expect(result.rawPatch).toContain('.box { display: flex !important; margin-top: 10px !important; }');
    expect(result.html).toContain('style="display: flex; margin-top: 10px;"');
  });

  it('applies InsertNode correctly', () => {
    const ops: EditOp[] = [
      {
        id: '6',
        type: 'InsertNode',
        selector: '#container',
        htmlSnippet: '<span class="new-node">New Element</span>'
      }
    ];

    const result = applyDomPatch(mockHtml, {}, ops);

    expect(result.changedSelectors).toContain('#container');
    expect(result.rawPatch).toContain('Inserted node under #container');
    expect(result.html).toContain('<span class="new-node">New Element</span>');
  });

  it('applies DeleteNode correctly', () => {
    const ops: EditOp[] = [
      {
        id: '7',
        type: 'DeleteNode',
        selector: '.box'
      }
    ];

    const result = applyDomPatch(mockHtml, {}, ops);

    expect(result.changedSelectors).toContain('.box');
    expect(result.rawPatch).toContain('Deleted nodes matching .box');
    expect(result.html).not.toContain('Box 1');
    expect(result.html).not.toContain('Box 2');
  });

  it('applies ReplaceNode correctly', () => {
    const ops: EditOp[] = [
      {
        id: '8',
        type: 'ReplaceNode',
        selector: '.title',
        htmlSnippet: '<h2 class="new-title">Replaced Title</h2>'
      }
    ];

    const result = applyDomPatch(mockHtml, {}, ops);

    expect(result.changedSelectors).toContain('.title');
    expect(result.rawPatch).toContain('Replaced nodes matching .title');
    expect(result.html).not.toContain('<h1 class="title">Hello World</h1>');
    expect(result.html).toContain('<h2 class="new-title">Replaced Title</h2>');
  });
});
