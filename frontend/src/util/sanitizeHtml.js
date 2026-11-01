import DOMPurify from 'dompurify';

const YOUTUBE_EMBED = /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\/[\w-]+/;

// 게시글 본문은 다른 사람이 쓴 내용이다. 스크립트와 이벤트 속성은 지우고, 삽입은 유튜브만 허용한다
const purify = DOMPurify(window);
purify.addHook('uponSanitizeElement', (node, data) => {
  if (data.tagName === 'iframe' && !YOUTUBE_EMBED.test(node.getAttribute('src') || '')) {
    node.remove();
  }
});

export const sanitizeHtml = (html) => purify.sanitize(html, {
  ADD_TAGS: ['iframe'],
  ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'data-nodeid', 'data-language'],
});
