import * as cheerio from "cheerio";
export function applyDomPatch(html, cssVars, ops) {
    const $ = cheerio.load(html);
    const nextCssVars = { ...cssVars };
    const changedSelectors = new Set();
    const cssUpdates = [];
    const structuralUpdates = [];
    for (const op of ops) {
        const selector = op.selector;
        if (!selector)
            continue;
        const matchedElements = $(selector);
        // If element is not found and it's not a CSS variable update, skip
        if (matchedElements.length === 0 && !op.cssVar)
            continue;
        changedSelectors.add(selector);
        switch (op.type) {
            case "ColorChange": {
                const value = op.value || "";
                if (op.cssVar) {
                    nextCssVars[op.cssVar] = value;
                    cssUpdates.push(`:root { ${op.cssVar}: ${value}; }`);
                }
                else {
                    cssUpdates.push(`${selector} { background: ${value} !important; }`);
                }
                matchedElements.each((_, el) => {
                    const style = $(el).attr("style") || "";
                    const styleObj = parseInlineStyle(style);
                    styleObj["background"] = value;
                    $(el).attr("style", serializeInlineStyle(styleObj));
                });
                break;
            }
            case "TypographyUpdate": {
                const value = op.value || "";
                if (op.cssVar) {
                    nextCssVars[op.cssVar] = value;
                    cssUpdates.push(`:root { ${op.cssVar}: ${value}; }`);
                }
                else {
                    cssUpdates.push(`${selector} { font-size: ${value} !important; }`);
                }
                matchedElements.each((_, el) => {
                    const style = $(el).attr("style") || "";
                    const styleObj = parseInlineStyle(style);
                    styleObj["font-size"] = value;
                    $(el).attr("style", serializeInlineStyle(styleObj));
                });
                break;
            }
            case "LayoutShift": {
                if (!op.attributes)
                    break;
                const attrs = op.attributes;
                matchedElements.each((_, el) => {
                    const style = $(el).attr("style") || "";
                    const styleObj = parseInlineStyle(style);
                    Object.entries(attrs).forEach(([k, v]) => {
                        styleObj[k] = v;
                    });
                    $(el).attr("style", serializeInlineStyle(styleObj));
                });
                cssUpdates.push(`${selector} { ${Object.entries(attrs)
                    .map(([k, v]) => `${k}: ${v} !important;`)
                    .join(" ")} }`);
                break;
            }
            case "InsertNode": {
                const htmlSnippet = op.htmlSnippet || op.value || "";
                if (!htmlSnippet)
                    break;
                matchedElements.append(htmlSnippet);
                structuralUpdates.push(`Inserted node under ${selector}`);
                break;
            }
            case "DeleteNode": {
                matchedElements.remove();
                structuralUpdates.push(`Deleted nodes matching ${selector}`);
                break;
            }
            case "ReplaceNode": {
                const htmlSnippet = op.htmlSnippet || op.value || "";
                if (!htmlSnippet)
                    break;
                matchedElements.replaceWith(htmlSnippet);
                structuralUpdates.push(`Replaced nodes matching ${selector}`);
                break;
            }
        }
    }
    // Generate CSS custom properties rules block
    if (Object.keys(nextCssVars).length > 0) {
        const cssVarString = Object.entries(nextCssVars)
            .map(([k, v]) => `  ${k}: ${v};`)
            .join("\n");
        const rootStyleStr = `:root {\n${cssVarString}\n}`;
        let rootStyleTag = $("style#rl-root-vars");
        if (rootStyleTag.length > 0) {
            rootStyleTag.text(rootStyleStr);
        }
        else {
            $("head").append(`<style id="rl-root-vars">\n${rootStyleStr}\n</style>`);
        }
    }
    // Handle patch stylesheets tag
    let patchStyleTag = $("style#rl-patch-styles");
    if (cssUpdates.length > 0) {
        if (patchStyleTag.length > 0) {
            const existing = patchStyleTag.text();
            patchStyleTag.text(existing + "\n" + cssUpdates.join("\n"));
        }
        else {
            $("head").append(`<style id="rl-patch-styles">\n${cssUpdates.join("\n")}\n</style>`);
        }
    }
    const rawPatch = buildRawPatch(cssUpdates, structuralUpdates);
    const finalHtml = $.html();
    return {
        html: finalHtml,
        cssVars: nextCssVars,
        rawPatch,
        changedSelectors: Array.from(changedSelectors)
    };
}
function buildRawPatch(cssUpdates, structuralUpdates) {
    const cssBlock = cssUpdates.length > 0
        ? `<style>\n${cssUpdates.join("\n")}\n</style>\n`
        : "";
    const structuralBlock = structuralUpdates.length > 0
        ? `<!-- DOMPatch: ${structuralUpdates.join(" | ")} -->\n`
        : "";
    return cssBlock + structuralBlock;
}
function parseInlineStyle(styleStr) {
    const result = {};
    if (!styleStr)
        return result;
    const parts = styleStr.split(";");
    for (const part of parts) {
        const [k, v] = part.split(":");
        if (k && v) {
            result[k.trim()] = v.trim();
        }
    }
    return result;
}
function serializeInlineStyle(styleObj) {
    return Object.entries(styleObj)
        .map(([k, v]) => `${k}: ${v}`)
        .join("; ") + ";";
}
