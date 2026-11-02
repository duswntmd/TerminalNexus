// 빌드 뒤 공개 페이지마다 제목·설명·본문이 들어간 HTML을 만든다.
// 자바스크립트를 실행하지 않는 크롤러도 페이지 내용을 읽을 수 있게 하고, 화면이 뜨면 React가 대체한다.
// sitemap.xml도 같은 목록으로 생성한다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ARTICLES } from '../src/content/articles.js';
import { ALL_NAV } from '../src/nav.js';
import * as AR from '../src/content/arcRaiders.js';

const SITE = 'https://tnhub.kr';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const ko = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/ko.json'), 'utf8'));
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8');

const TOOL_IDS = ['json', 'encode', 'jwt', 'timestamp', 'regex', 'hash', 'subnet', 'raid', 'cron', 'chmod', 'nginx', 'transfer'];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const link = (href, text) => `<a href="${esc(href)}">${esc(text)}</a>`;
const links = (items) => `<ul>${items.map(([href, text]) => `<li>${link(href, text)}</li>`).join('')}</ul>`;

const blockHtml = (b) => {
  if (b.h) return `<h2>${esc(b.h)}</h2>`;
  if (b.code) return `<pre><code>${esc(b.code)}</code></pre>`;
  if (b.list) return `<ul>${b.list.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
  return `<p>${esc(b.p)}</p>`;
};

const crumbs = (items) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + url })),
});

const siteLinks = `<nav>${links([
  ['/learn', ko.learn.title], ['/tools', ko.tools.title], ['/cert', ko.cert.title], ['/lotto', '로또 6/45 당첨번호'], ['/about', '사이트 소개와 운영 원칙'], ['/guide', '기능 안내'], ['/privacy', '개인정보처리방침'], ['/terms', '이용약관'],
])}</nav>`;

const pages = [];
const add = (page) => pages.push(page);

add({
  url: '/',
  file: 'home.html',
  title: template.match(/<title>([^<]*)/)[1],
  desc: '리눅스 자격증 연습, 개발·인프라 도구, 서버 학습 글, 로또 당첨번호를 한곳에서 이용하세요.',
  body: `<h1>TerminalNexus</h1><p>리눅스 자격증 연습, 개발·인프라 도구, 서버 학습 글, 로또 당첨번호를 한곳에서 이용하세요.</p>
<h2>${esc(ko.learn.title)}</h2>${links(ARTICLES.map((a) => [`/learn/${a.slug}`, a.title]))}
<h2>${esc(ko.tools.title)}</h2>${links(TOOL_IDS.map((id) => [`/tools/${id}`, ko.tools[id].name]))}`,
});

add({
  url: '/tools',
  title: ko.tools.meta_title,
  desc: ko.tools.meta_desc,
  body: `<h1>${esc(ko.tools.title)}</h1><p>${esc(ko.tools.subtitle)}</p>
<ul>${TOOL_IDS.map((id) => `<li>${link(`/tools/${id}`, ko.tools[id].name)}: ${esc(ko.tools[id].desc)}</li>`).join('')}</ul>`,
  jsonLd: [crumbs([[ko.tools.title, '/tools']])],
});

for (const id of TOOL_IDS) {
  const tool = ko.tools[id];
  const related = ARTICLES.filter((a) => a.tool === id);
  add({
    url: `/tools/${id}`,
    title: `${tool.name} | TerminalNexus`,
    desc: tool.desc,
    body: `<p>${link('/tools', ko.tools.title)}</p><h1>${esc(tool.name)}</h1><p>${esc(tool.desc)}</p>
${(tool.guide || []).map((g) => `<h2>${esc(g.q)}</h2><p>${esc(g.a)}</p>`).join('')}
${related.length ? `<h2>관련 글</h2>${links(related.map((a) => [`/learn/${a.slug}`, a.title]))}` : ''}
<h2>${esc(ko.tools.others)}</h2>${links(TOOL_IDS.filter((x) => x !== id).map((x) => [`/tools/${x}`, ko.tools[x].name]))}`,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'WebApplication', name: tool.name, description: tool.desc, url: `${SITE}/tools/${id}`, applicationCategory: 'DeveloperApplication', operatingSystem: 'Any', offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' } },
      crumbs([[ko.tools.title, '/tools'], [tool.name, `/tools/${id}`]]),
    ],
  });
}

add({
  url: '/learn',
  title: ko.learn.meta_title,
  desc: ko.learn.meta_desc,
  body: `<h1>${esc(ko.learn.title)}</h1><p>${esc(ko.learn.subtitle)}</p>
<ul>${ARTICLES.map((a) => `<li>${link(`/learn/${a.slug}`, a.title)}: ${esc(a.desc)}</li>`).join('')}</ul>`,
  jsonLd: [crumbs([[ko.learn.title, '/learn']])],
});

for (const a of ARTICLES) {
  add({
    url: `/learn/${a.slug}`,
    lastmod: a.date,
    title: `${a.title} | TerminalNexus`,
    desc: a.desc,
    type: 'article',
    body: `<article><p>${link('/learn', ko.learn.title)}</p><h1>${esc(a.title)}</h1><p>${esc(a.desc)}</p><p>글 에고수 · ${a.date}</p>
${a.body.map(blockHtml).join('')}<p>${link(`/tools/${a.tool}`, ko.tools[a.tool].name)}</p></article>`,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'TechArticle', headline: a.title, description: a.desc, datePublished: a.date, dateModified: a.date, inLanguage: 'ko', url: `${SITE}/learn/${a.slug}`, author: { '@type': 'Person', name: '에고수', url: `${SITE}/about` }, publisher: { '@type': 'Organization', name: 'TerminalNexus', logo: { '@type': 'ImageObject', url: `${SITE}/favicon-192.png` } } },
      crumbs([[ko.learn.title, '/learn'], [a.title, `/learn/${a.slug}`]]),
    ],
  });
}

add({
  url: '/cert',
  title: ko.cert.meta_title,
  desc: ko.cert.meta_desc,
  body: `<h1>${esc(ko.cert.title)}</h1><p>${esc(ko.cert.subtitle)}</p>
<h2>${esc(ko.cert.practice_title)}</h2><p>${esc(ko.cert.practice_desc)}</p>
<ul><li>${esc(ko.cert.subject_basic)}</li><li>${esc(ko.cert.subject_ops)}</li><li>${esc(ko.cert.subject_apps)}</li></ul>
<p>${esc(ko.cert.disclaimer)}</p>`,
});

add({
  url: '/lotto',
  title: '로또 6/45 당첨번호 조회와 통계 | TerminalNexus',
  desc: ko.lotto.subtitle || '로또 6/45 회차별 당첨번호와 번호 통계를 확인하세요.',
  body: `<h1>로또 6/45 당첨번호</h1><p>${esc(ko.lotto.subtitle || '')}</p><p>회차별 당첨번호, 번호 통계, 내 번호 확인, 번호 생성 기능을 제공합니다. 로또 추첨은 무작위이며 어떤 도구도 당첨을 보장하지 않습니다.</p>`,
});

add({
  url: '/about',
  title: ko.about.meta_title,
  desc: ko.about.meta_desc,
  body: `<h1>${esc(ko.about.title)}</h1><p>${esc(ko.about.intro)}</p>${ko.about.sections.map((s) => `<h2>${esc(s.h)}</h2><p>${esc(s.p)}</p>`).join('')}`,
});

// 약관류는 화면 코드의 한국어 본문을 그대로 옮긴다
const legalBody = (file) => {
  const src = fs.readFileSync(path.join(ROOT, 'src/pages', file), 'utf8');
  const ko = src.slice(src.indexOf('const KO_CONTENT'), src.indexOf('const EN_CONTENT'));
  return [...ko.matchAll(/<Typography\s+variant="(\w+)"[^>]*>([\s\S]*?)<\/Typography>/g)].map(([, variant, text]) => {
    const tag = { h4: 'h1', h6: 'h2' }[variant] || 'p';
    const clean = text.replace(/\{' '\}/g, ' ').trim().replace(/\s+/g, ' ');
    return `<${tag}>${clean}</${tag}>`;
  }).join('');
};

add({ url: '/privacy', title: '개인정보처리방침 | TerminalNexus', desc: 'TerminalNexus의 개인정보처리방침입니다.', body: legalBody('PrivacyPolicyPage.jsx') });
add({ url: '/terms', title: '이용약관 | TerminalNexus', desc: 'TerminalNexus의 이용약관입니다.', body: legalBody('TermsOfServicePage.jsx') });

add({ url: '/guide', title: '기능 안내 | TerminalNexus', desc: '터미널넥서스에서 이용할 수 있는 기능을 소개합니다.', body: `<h1>기능 안내</h1>${ko.guide.groups.map((g) => `<h2>${esc(g.name || g.title || '')}</h2><ul>${g.items.map((i) => `<li>${link(i.path, i.name)}: ${esc(i.desc)}</li>`).join('')}</ul>`).join('')}` });

// ARC Raiders 비공식 정보: 하위 페이지마다 데이터 전체를 본문으로 넣는다
const arcSrc = (ids) => ids.map((id) => link(AR.SOURCES[id].url, AR.SOURCES[id].name)).join(', ');
const arcFoot = (ids) => `<p>정보 확인일 ${AR.CHECKED} · 출처: ${arcSrc([...new Set(ids)])}</p>`;
const arcBody = {
  '': () => `<h2>게임 개요</h2><ul>${AR.FACTS.map((f) => `<li>${esc(f.k)}: ${esc(f.v)}${f.note ? ` (${esc(f.note)})` : ''}</li>`).join('')}</ul>${arcFoot(AR.FACTS.flatMap((f) => f.src))}
<h2>한 판의 흐름 (탈출형 루프)</h2><ol>${AR.LOOP.map((l) => `<li>${esc(l.step)}: ${esc(l.text)}</li>`).join('')}</ol>
<h2>핵심 시스템</h2>${AR.SYSTEMS.map((s) => `<h3>${esc(s.name)}</h3><p>${esc(s.text)}</p>`).join('')}${arcFoot(AR.SYSTEMS.flatMap((s) => s.src))}
<h2>초보자 팁</h2>${AR.TIPS.map((t) => `<h3>${esc(t.h)}</h3><p>${esc(t.p)}</p>`).join('')}${arcFoot(AR.TIPS.flatMap((t) => t.src))}`,
  maps: () => `<h2>맵 목록</h2>${AR.MAPS.map((m) => `<h3>${esc(m.name)} (${esc(m.ko)})</h3><p>추가 ${m.added} · ${esc(m.update)}. ${esc(m.text)}${m.keys.length ? ` 알려진 열쇠: ${esc(m.keys.join(', '))}` : ''}</p>`).join('')}${arcFoot(AR.MAPS.flatMap((m) => m.src))}
<h2>맵 조건</h2><ul>${AR.CONDITIONS.map((c) => `<li>${esc(c.name)}: ${esc(c.text)}</li>`).join('')}</ul>${arcFoot(AR.CONDITIONS.flatMap((c) => c.src))}`,
  arc: () => `<h2>ARC(적) 목록</h2><table><thead><tr><th>이름</th><th>형태</th><th>위협도</th><th>장갑</th><th>등장</th><th>설명</th></tr></thead><tbody>${AR.ARC.map((a) => `<tr><td>${esc(a.name)}</td><td>${esc(a.type)}</td><td>${esc(a.threat)}</td><td>${esc(a.armor)}</td><td>${esc(a.since)}</td><td>${esc(a.text)}</td></tr>`).join('')}</tbody></table>
<p>${esc(ko.arc.arc_hint)}</p>${arcFoot(AR.ARC.flatMap((a) => a.src))}`,
  updates: () => `<h2>업데이트 기록</h2><ul>${[...AR.UPDATES].reverse().map((u) => `<li>${u.date} ${esc(u.name)}: ${esc(u.text)}</li>`).join('')}</ul>${arcFoot(AR.UPDATES.flatMap((u) => u.src))}`,
};
for (const pg of AR.ARC_PAGES) {
  const url = pg.id ? `/games/arc-raiders/${pg.id}` : '/games/arc-raiders';
  add({
    url,
    lastmod: AR.CHECKED,
    title: `${pg.title} | TerminalNexus`,
    desc: pg.desc,
    type: 'article',
    body: `<article><p>${esc(ko.arc.disclaimer)}</p><h1>${esc(pg.title)}</h1><p>${esc(pg.desc)}</p><p>정리 에고수 · 정보 확인일 ${AR.CHECKED}</p>
${links(AR.ARC_PAGES.filter((x) => x !== pg).map((x) => [x.id ? `/games/arc-raiders/${x.id}` : '/games/arc-raiders', x.title]))}
${arcBody[pg.id]()}</article>`,
    jsonLd: [
      { '@context': 'https://schema.org', '@type': 'Article', headline: pg.title, description: pg.desc, dateModified: AR.CHECKED, inLanguage: 'ko', url: SITE + url, about: { '@type': 'VideoGame', name: 'ARC Raiders' }, author: { '@type': 'Person', name: '에고수', url: `${SITE}/about` }, publisher: { '@type': 'Organization', name: 'TerminalNexus', logo: { '@type': 'ImageObject', url: `${SITE}/favicon-192.png` } } },
      crumbs([['ARC Raiders 정보', '/games/arc-raiders'], ...(pg.id ? [[pg.short, url]] : [])]),
    ],
  });
}

for (const item of ALL_NAV.filter((n) => !n.login && !pages.some((p) => p.url === n.path))) {
  const nav = ko.nav[item.key];
  add({ url: item.path, title: `${nav.name} | TerminalNexus`, desc: nav.desc, body: `<h1>${esc(nav.name)}</h1><p>${esc(nav.desc)}</p>` });
}

const render = ({ url, title, desc, body, jsonLd = [], type }) => {
  const full = SITE + (url === '/' ? '/' : url);
  const meta = (attr, name, value) => [new RegExp(`(<meta\\s+${attr}="${name}"\\s+content=")[^"]*(")`), `$1${esc(value).replace(/\$/g, '$$$$')}$2`];
  let html = template;
  for (const [from, to] of [
    [/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`],
    meta('name', 'description', desc),
    [/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${full}"`],
    meta('property', 'og:url', full),
    meta('property', 'og:title', title),
    meta('property', 'og:description', desc),
    meta('name', 'twitter:title', title),
    meta('name', 'twitter:description', desc),
    ...(type ? [meta('property', 'og:type', type)] : []),
  ]) {
    if (!from.test(html)) throw new Error(`prerender: 템플릿에서 찾지 못함 ${from}`);
    html = html.replace(from, to);
  }
  const ld = jsonLd.map((d) => `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`).join('');
  return html.replace('</head>', `${ld}</head>`).replace('<div id="root"></div>', `<div id="root"><main class="pr-page">${body}${siteLinks}</main></div>`);
};

for (const page of pages) {
  // /tools/json → tools/json.html: 폴더로 만들면 nginx가 끝에 /를 붙여 리다이렉트한다
  const file = path.join(DIST, page.file || `${page.url.slice(1)}.html`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, render(page));
}

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((p) => `  <url>\n    <loc>${SITE}${p.url}</loc>${p.lastmod ? `\n    <lastmod>${p.lastmod}</lastmod>` : ''}\n  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sitemap);
const xml = (s) => esc(s).replace(/'/g, '&apos;');
const rssItems = [...ARTICLES].sort((a, b) => b.date.localeCompare(a.date)).map((a) => `    <item>
      <title>${xml(a.title)}</title>
      <link>${SITE}/learn/${a.slug}</link>
      <guid isPermaLink="true">${SITE}/learn/${a.slug}</guid>
      <description>${xml(a.desc)}</description>
      <content:encoded><![CDATA[${a.body.map(blockHtml).join('').replace(/]]>/g, ']]]]><![CDATA[>')}]]></content:encoded>
      <pubDate>${new Date(`${a.date}T09:00:00+09:00`).toUTCString()}</pubDate>
    </item>`).join('\n');
fs.writeFileSync(path.join(DIST, 'rss.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${xml(ko.learn.title)} - TerminalNexus</title>
    <link>${SITE}/learn</link>
    <description>${xml(ko.learn.meta_desc)}</description>
    <language>ko</language>
${rssItems}
  </channel>
</rss>
`);
console.log(`prerender: 페이지 ${pages.length}개와 sitemap.xml 생성`);
