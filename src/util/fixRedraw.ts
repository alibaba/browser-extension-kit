/**
 * Temporary workaround for secondary monitors on MacOS where redraws don't happen
 * @see https://bugs.chromium.org/p/chromium/issues/detail?id=971701
 */
export function fixRedraw() {
  if (
    // From testing the following conditions seem to indicate that the popup was opened on a secondary monitor
    window.screenLeft < 0 ||
    window.screenTop < 0 ||
    window.screenLeft > window.screen.width ||
    window.screenTop > window.screen.height
  ) {
    chrome.runtime.getPlatformInfo(info => {
      if (info.os === 'mac') {
        const fontFaceSheet = new CSSStyleSheet();
        fontFaceSheet.insertRule(`
        @keyframes redraw {
          0% {
            opacity: 1;
          }
          100% {
            opacity: .99;
          }
        }
      `);
        fontFaceSheet.insertRule(`
        html {
          animation: redraw 1s linear infinite;
        }
      `);
        (document as any).adoptedStyleSheets = [...(document as any).adoptedStyleSheets, fontFaceSheet];
      }
    });
  }
}
