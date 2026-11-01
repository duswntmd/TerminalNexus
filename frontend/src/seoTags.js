// index.html과 사전 렌더링 페이지의 정적 태그는 크롤러용이다.
// 화면이 뜨고 React가 같은 태그를 넣으면 정적 태그를 지워 canonical 등이 두 개가 되지 않게 한다.
const SELECTORS = ['title', 'meta[name="description"]', 'link[rel="canonical"]'];

export const replaceStaticTagsOnRender = () => {
  const statics = new Map(SELECTORS.map((sel) => [sel, document.head.querySelector(sel)]));

  new MutationObserver((records) => {
    for (const { addedNodes } of records) {
      for (const node of addedNodes) {
        if (node.nodeType !== Node.ELEMENT_NODE) continue;
        for (const [sel, tag] of statics) {
          if (tag && node !== tag && node.matches(sel)) {
            tag.remove();
            statics.set(sel, null);
          }
        }
      }
    }
  }).observe(document.head, { childList: true });
};
