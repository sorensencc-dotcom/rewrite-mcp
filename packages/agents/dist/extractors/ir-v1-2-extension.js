/**
 * Build extended IR packet v1.2 with Playwright data.
 * Merges static extraction (v1.0) + CSS metrics (v1.1) + browser rendering (v1.2).
 */
export class IRPacketV12Builder {
    buildExtension(playwrightModel) {
        return {
            playwrightEnabled: true,
            computedStyles: playwrightModel.computedStyles,
            screenshots: playwrightModel.screenshots.map(s => ({
                type: 'viewport',
                dataUrl: s.dataUrl,
                width: s.width,
                height: s.height,
            })),
            interactiveElements: {
                count: this.countInteractiveElements(playwrightModel),
                elements: playwrightModel.interactiveElements.map(el => ({
                    tag: el.tag,
                    text: el.text,
                    ariaLabel: el.ariaLabel,
                    isVisible: el.isVisible,
                    isDisabled: el.isDisabled,
                })),
            },
            performanceMetrics: playwrightModel.performanceMetrics
                ? {
                    navigationTimeMs: playwrightModel.performanceMetrics.loadEventEnd - playwrightModel.performanceMetrics.navigationStart,
                    domContentLoadedMs: playwrightModel.performanceMetrics.domContentLoadedEventEnd - playwrightModel.performanceMetrics.navigationStart,
                    firstContentfulPaintMs: Math.round(playwrightModel.performanceMetrics.firstContentfulPaint),
                    jsExecutionTimeMs: playwrightModel.jsExecutionTime,
                }
                : undefined,
        };
    }
    countInteractiveElements(model) {
        const counts = {
            buttons: 0,
            inputs: 0,
            links: 0,
            selects: 0,
            textareas: 0,
            customClickable: 0,
        };
        for (const el of model.interactiveElements) {
            if (el.tag === 'button')
                counts.buttons++;
            else if (el.tag === 'input')
                counts.inputs++;
            else if (el.tag === 'a')
                counts.links++;
            else if (el.tag === 'select')
                counts.selects++;
            else if (el.tag === 'textarea')
                counts.textareas++;
            else if (el.tag === 'div' || el.tag === 'span')
                counts.customClickable++;
        }
        return counts;
    }
}
