import React, { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Button, Chip, CircularProgress, Container, InputAdornment, Pagination,
  Stack, Tab, Tabs, TextField, ToggleButton, ToggleButtonGroup, Typography, useMediaQuery,
} from '@mui/material';
import CasinoIcon from '@mui/icons-material/Casino';
import SearchIcon from '@mui/icons-material/Search';
import { Ball, BallRow, NumberPicker, Panel } from './LottoParts';
import { ballColor, checkAgainstHistory, formatWon, numberStats, pickNumbers } from './lottoUtils';

const PAGE_SIZE = 15;
const TABS = ['history', 'stats', 'check', 'generate'];

/** 다음 추첨까지 남은 시간 (매주 토요일 20:35 KST) */
const useCountdown = (nextDrawDate) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (!nextDrawDate) return null;
  return Date.parse(`${nextDrawDate}T20:35:00+09:00`) - now;
};

const LatestCard = ({ latest, t, lang }) => {
  const left = useCountdown(latest?.nextDrawDate);
  const narrow = useMediaQuery('(max-width:420px)');
  if (!latest) return null;

  let countdown;
  if (left == null) countdown = '';
  else if (left <= 0) countdown = t('lotto.tallying');
  else {
    const s = Math.floor(left / 1000);
    countdown = t('lotto.countdown', {
      d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600),
      m: Math.floor((s % 3600) / 60), s: s % 60,
    });
  }

  return (
    <Panel sx={{ borderColor: 'rgba(249,202,36,0.25)', background: 'linear-gradient(135deg, rgba(249,202,36,0.06), #0a0a0c 60%)' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} justifyContent="space-between" alignItems={{ md: 'center' }}>
        <Box>
          <Typography sx={{ color: '#f9ca24', fontWeight: 800, fontSize: '0.8rem', mb: 0.5 }}>
            {t('lotto.latest_label')}
          </Typography>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: '1.4rem', md: '1.7rem' }, mb: 0.3 }}>
            {t('lotto.draw_no', { no: latest.drwNo })}
          </Typography>
          <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.85rem', mb: 2 }}>
            {t('lotto.draw_date', { date: latest.date })}
          </Typography>
          <BallRow numbers={latest.numbers} bonus={latest.bonus} size={narrow ? 34 : 46} />
        </Box>
        <Stack spacing={1.2} sx={{ minWidth: { md: 300 } }}>
          <Row label={t('lotto.first_prize')} value={formatWon(latest.firstPrize, lang)} strong />
          <Row label={t('lotto.first_winners')} value={t('lotto.people', { count: latest.firstWinners ?? 0 })} />
          <Row label={t('lotto.second_prize')} value={`${formatWon(latest.secondPrize, lang)} · ${t('lotto.people', { count: latest.secondWinners ?? 0 })}`} />
          <Row label={t('lotto.total_sales')} value={formatWon(latest.totalSales, lang)} />
          <Box sx={{ mt: 1, p: 1.2, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <Typography sx={{ color: 'var(--tn-text-2)', fontSize: '0.75rem' }}>
              {t('lotto.next_draw', { date: latest.nextDrawDate })}
            </Typography>
            <Typography sx={{ color: '#f4f4f5', fontWeight: 700, fontSize: '0.95rem', fontVariantNumeric: 'tabular-nums' }}>
              {countdown}
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Panel>
  );
};

const Row = ({ label, value, strong }) => (
  <Stack direction="row" justifyContent="space-between" spacing={2}>
    <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.85rem' }}>{label}</Typography>
    <Typography sx={{ color: strong ? '#f9ca24' : '#e4e4e7', fontWeight: strong ? 800 : 600, fontSize: '0.88rem', textAlign: 'right' }}>
      {value}
    </Typography>
  </Stack>
);

/* ── 회차별 결과 ── */
const HistoryTab = ({ draws, t }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return draws;
    const nums = q.split(/[\s,]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0);
    if (nums.length === 1 && nums[0] > 45) return draws.filter((d) => d.no === nums[0]);
    // 1~45 숫자를 넣으면 그 번호들이 모두 나온 회차
    return draws.filter((d) => nums.every((n) => d.numbers.includes(n) || d.bonus === n));
  }, [draws, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const shown = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Panel>
      <TextField
        size="small" fullWidth value={query}
        onChange={(e) => { setQuery(e.target.value); setPage(1); }}
        placeholder={t('lotto.search_placeholder')}
        InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: 'var(--tn-text-3)' }} /></InputAdornment> }}
        sx={inputSx}
      />
      <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.75rem', mt: 1, mb: 2 }}>
        {t('lotto.result_count', { count: filtered.length })}
      </Typography>
      <Stack divider={<Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)' }} />}>
        {shown.map((d) => (
          <Stack key={d.no} direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} spacing={{ xs: 1, sm: 2 }} sx={{ py: 1.3 }}>
            <Box sx={{ minWidth: 120 }}>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>{t('lotto.draw_no', { no: d.no })}</Typography>
              <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.75rem' }}>{d.date}</Typography>
            </Box>
            <BallRow numbers={d.numbers} bonus={d.bonus} size={32} />
          </Stack>
        ))}
        {shown.length === 0 && (
          <Typography sx={{ color: 'var(--tn-text-3)', py: 4, textAlign: 'center' }}>{t('lotto.no_result')}</Typography>
        )}
      </Stack>
      {pages > 1 && (
        <Pagination
          count={pages} page={page} onChange={(_, p) => setPage(p)} siblingCount={0}
          sx={{ mt: 2, display: 'flex', justifyContent: 'center', '& .MuiPaginationItem-root': { color: 'var(--tn-text-2)' } }}
        />
      )}
    </Panel>
  );
};

/* ── 번호 통계 ── */
const RANGES = [0, 100, 50, 20];

const StatsTab = ({ draws, t }) => {
  const [range, setRange] = useState(0);
  const [bonus, setBonus] = useState(false);

  const stats = useMemo(
    () => numberStats(range ? draws.slice(0, range) : draws, { includeBonus: bonus }),
    [draws, range, bonus],
  );
  // 번호별 차이가 작아서 최소~최대 구간을 막대 높이 25~100%로 펼쳐 보여줌
  const max = Math.max(...stats.map((s) => s.count), 1);
  const min = Math.min(...stats.map((s) => s.count));
  const barHeight = (c) => (max === min ? 100 : 25 + (75 * (c - min)) / (max - min));
  const byCount = [...stats].sort((a, b) => b.count - a.count || a.n - b.n);
  const longest = [...stats].sort((a, b) => (b.gap ?? 1e9) - (a.gap ?? 1e9)).slice(0, 6);

  return (
    <Stack spacing={2}>
      <Panel>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="space-between" sx={{ mb: 2.5 }}>
          <ToggleButtonGroup size="small" exclusive value={range} onChange={(_, v) => v != null && setRange(v)} sx={toggleSx}>
            {RANGES.map((r) => (
              <ToggleButton key={r} value={r}>{r ? t('lotto.recent_n', { n: r }) : t('lotto.all_draws')}</ToggleButton>
            ))}
          </ToggleButtonGroup>
          <ToggleButtonGroup size="small" exclusive value={bonus} onChange={(_, v) => v != null && setBonus(v)} sx={toggleSx}>
            <ToggleButton value={false}>{t('lotto.main_only')}</ToggleButton>
            <ToggleButton value={true}>{t('lotto.with_bonus')}</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        {/* 번호별 막대 */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(5, 1fr)', sm: 'repeat(9, 1fr)' }, gap: 1 }}>
          {stats.map((s) => (
            <Box key={s.n} sx={{ textAlign: 'center' }}>
              <Box sx={{ height: 70, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', mb: 0.5 }}>
                <Box sx={{ width: '60%', height: `${barHeight(s.count)}%`, minHeight: 2, bgcolor: ballColor(s.n), borderRadius: '4px 4px 0 0', opacity: 0.85 }} />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}><Ball n={s.n} size={26} /></Box>
              <Typography sx={{ color: 'var(--tn-text-2)', fontSize: '0.7rem', mt: 0.3 }}>{s.count}</Typography>
            </Box>
          ))}
        </Box>
      </Panel>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        <StatList title={t('lotto.most_drawn')} items={byCount.slice(0, 6)} render={(s) => t('lotto.times', { count: s.count })} />
        <StatList title={t('lotto.least_drawn')} items={byCount.slice(-6).reverse()} render={(s) => t('lotto.times', { count: s.count })} />
        <StatList title={t('lotto.longest_gap')} items={longest} render={(s) => (s.gap == null ? t('lotto.never') : t('lotto.draws_ago', { count: s.gap }))} />
      </Box>
      <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.75rem', px: 1 }}>{t('lotto.stats_note')}</Typography>
    </Stack>
  );
};

const StatList = ({ title, items, render }) => (
  <Panel>
    <Typography sx={{ fontWeight: 700, fontSize: '0.9rem', mb: 1.5 }}>{title}</Typography>
    <Stack spacing={1}>
      {items.map((s) => (
        <Stack key={s.n} direction="row" alignItems="center" spacing={1.5}>
          <Ball n={s.n} size={28} />
          <Typography sx={{ color: 'var(--tn-text-2)', fontSize: '0.85rem' }}>{render(s)}</Typography>
        </Stack>
      ))}
    </Stack>
  </Panel>
);

/* ── 내 번호 확인 ── */
const CheckTab = ({ draws, t, initial }) => {
  const [picked, setPicked] = useState(initial || []);
  useEffect(() => { if (initial) setPicked(initial); }, [initial]);

  const toggle = (n) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 6 ? [...p, n].sort((a, b) => a - b) : p));
  const result = useMemo(() => (picked.length === 6 ? checkAgainstHistory(picked, draws) : null), [picked, draws]);

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '440px 1fr' }, gap: 2 }}>
      <Panel>
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{t('lotto.check_title')}</Typography>
        <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.8rem', mb: 2 }}>{t('lotto.check_desc')}</Typography>
        <NumberPicker state={(n) => (picked.includes(n) ? 'on' : 'off')} onToggle={toggle} />
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button size="small" variant="outlined" onClick={() => setPicked(pickNumbers())} sx={outlineBtnSx}>{t('lotto.random_fill')}</Button>
          <Button size="small" variant="outlined" onClick={() => setPicked([])} sx={outlineBtnSx}>{t('lotto.clear')}</Button>
        </Stack>
      </Panel>
      <Panel>
        <Box sx={{ minHeight: 46, mb: 2 }}>
          {picked.length ? <BallRow numbers={picked} size={40} /> : (
            <Typography sx={{ color: 'var(--tn-text-3)' }}>{t('lotto.pick_six', { left: 6, count: 6 })}</Typography>
          )}
        </Box>
        {!result && picked.length > 0 && (
          <Typography sx={{ color: 'var(--tn-text-3)' }}>{t('lotto.pick_six', { left: 6 - picked.length, count: 6 - picked.length })}</Typography>
        )}
        {result && (
          <>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 1, mb: 2.5 }}>
              {[1, 2, 3, 4, 5].map((r) => (
                <Box key={r} sx={{ textAlign: 'center', p: 1.2, borderRadius: '10px', bgcolor: result.counts[r] && r <= 3 ? 'rgba(249,202,36,0.08)' : 'rgba(255,255,255,0.03)' }}>
                  <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.72rem' }}>{t('lotto.rank', { r })}</Typography>
                  <Typography sx={{ fontWeight: 800, fontSize: '1.2rem', color: result.counts[r] && r <= 3 ? '#f9ca24' : '#e4e4e7' }}>{result.counts[r]}</Typography>
                </Box>
              ))}
            </Box>
            <Typography sx={{ color: 'var(--tn-text-2)', fontSize: '0.82rem', mb: 1.5 }}>
              {t('lotto.check_summary', { total: draws.length, win: draws.length - result.counts[0] })}
            </Typography>
            <Stack spacing={1.2}>
              {result.hits.slice(0, 10).map((d) => (
                <Stack key={d.no} direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.8, sm: 2 }} alignItems={{ sm: 'center' }}>
                  <Box sx={{ minWidth: 130 }}>
                    <Chip size="small" label={t('lotto.rank', { r: d.rank })} sx={{ mr: 1, height: 20, fontSize: '0.7rem', fontWeight: 700, bgcolor: d.rank <= 2 ? '#f9ca24' : 'rgba(255,255,255,0.08)', color: d.rank <= 2 ? '#000' : '#d4d4d8' }} />
                    <Typography component="span" sx={{ fontSize: '0.82rem', color: 'var(--tn-text-2)' }}>{t('lotto.draw_no', { no: d.no })}</Typography>
                  </Box>
                  <BallRow numbers={d.numbers} bonus={d.bonus} size={28} highlight={picked} />
                </Stack>
              ))}
              {result.hits.length === 0 && (
                <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.85rem' }}>{t('lotto.no_high_rank')}</Typography>
              )}
            </Stack>
          </>
        )}
      </Panel>
    </Box>
  );
};

/* ── 번호 생성 ── */
const GenerateTab = ({ t, onCheck }) => {
  const [fixed, setFixed] = useState([]);
  const [excluded, setExcluded] = useState([]);
  const [games, setGames] = useState([]);

  // 클릭할 때마다 기본 → 포함 → 제외 → 기본
  const cycle = (n) => {
    if (fixed.includes(n)) {
      setFixed((f) => f.filter((x) => x !== n));
      if (45 - excluded.length > 6) setExcluded((e) => [...e, n]);
    } else if (excluded.includes(n)) {
      setExcluded((e) => e.filter((x) => x !== n));
    } else if (fixed.length < 5) {
      setFixed((f) => [...f, n]);
    } else if (45 - excluded.length > 6) {
      setExcluded((e) => [...e, n]);
    }
  };

  const generate = () => setGames(Array.from({ length: 5 }, () => pickNumbers({ fixed, excluded })));

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '440px 1fr' }, gap: 2 }}>
      <Panel>
        <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{t('lotto.gen_title')}</Typography>
        <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.8rem', mb: 2 }}>{t('lotto.gen_desc')}</Typography>
        <NumberPicker state={(n) => (fixed.includes(n) ? 'on' : excluded.includes(n) ? 'x' : 'off')} onToggle={cycle} />
        <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.75rem', mt: 1.5 }}>
          {t('lotto.gen_status', { fixed: fixed.length, excluded: excluded.length })}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          <Button variant="contained" startIcon={<CasinoIcon />} onClick={generate} sx={primaryBtnSx}>{t('lotto.generate_5')}</Button>
          <Button size="small" variant="outlined" onClick={() => { setFixed([]); setExcluded([]); }} sx={outlineBtnSx}>{t('lotto.clear')}</Button>
        </Stack>
      </Panel>
      <Panel>
        {games.length === 0 ? (
          <Typography sx={{ color: 'var(--tn-text-3)' }}>{t('lotto.gen_empty')}</Typography>
        ) : (
          <Stack spacing={1.5}>
            {games.map((g, i) => (
              <Stack key={i} direction="row" alignItems="center" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Typography sx={{ color: 'var(--tn-text-3)', fontWeight: 800, width: 18 }}>{'ABCDE'[i]}</Typography>
                <BallRow numbers={g} size={36} />
                <Button size="small" onClick={() => onCheck(g)} sx={{ color: 'var(--tn-text-2)', textTransform: 'none', fontSize: '0.75rem' }}>
                  {t('lotto.check_this')}
                </Button>
              </Stack>
            ))}
          </Stack>
        )}
        <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.72rem', mt: 3, lineHeight: 1.6 }}>{t('lotto.gen_note')}</Typography>
      </Panel>
    </Box>
  );
};

const inputSx = {
  '& .MuiOutlinedInput-root': { color: '#e4e4e7', bgcolor: 'rgba(255,255,255,0.02)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } },
};
const toggleSx = {
  '& .MuiToggleButton-root': { color: 'var(--tn-text-2)', borderColor: 'rgba(255,255,255,0.1)', textTransform: 'none', px: 1.5 },
  '& .Mui-selected': { color: '#000 !important', bgcolor: '#f9ca24 !important' },
};
const outlineBtnSx = { color: 'var(--tn-text-2)', borderColor: 'rgba(255,255,255,0.15)', textTransform: 'none' };
const primaryBtnSx = { bgcolor: '#f9ca24', color: '#000', fontWeight: 800, textTransform: 'none', '&:hover': { bgcolor: '#f5bc00' } };

const LottoPage = () => {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const [params, setParams] = useSearchParams();
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'history';
  const [latest, setLatest] = useState(null);
  const [draws, setDraws] = useState(null);
  const [error, setError] = useState(false);
  const [checkNumbers, setCheckNumbers] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch('/api/lotto/latest').then((r) => (r.status === 200 ? r.json() : null)),
      fetch('/api/lotto/draws').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([l, d]) => { if (alive) { setLatest(l); setDraws(d); } })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, []);

  const setTab = (v) => setParams(v === 'history' ? {} : { tab: v }, { replace: true });

  return (
    <>
      <Helmet>
        <title>{t('lotto.meta_title')}</title>
        <meta name="description" content={t('lotto.meta_desc')} />
        <link rel="canonical" href="https://tnhub.kr/lotto" />
      </Helmet>
      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--tn-bg)', color: '#fff', pt: { xs: 12, md: 14 }, pb: 10 }}>
        <Container maxWidth="lg">
          <Typography component="h1" sx={{ fontWeight: 800, fontSize: { xs: '1.8rem', md: '2.4rem' }, letterSpacing: '-1px', mb: 1 }}>
            {t('lotto.title')}
          </Typography>
          <Typography sx={{ color: 'var(--tn-text-3)', mb: 4, fontSize: '0.92rem' }}>{t('lotto.subtitle')}</Typography>

          {error && <Typography sx={{ color: '#ef4444' }}>{t('lotto.load_error')}</Typography>}
          {!error && !draws && <Box sx={{ py: 10, textAlign: 'center' }}><CircularProgress sx={{ color: '#f9ca24' }} /></Box>}
          {!error && draws && draws.length === 0 && (
            <Panel><Typography sx={{ color: 'var(--tn-text-2)' }}>{t('lotto.syncing')}</Typography></Panel>
          )}

          {draws && draws.length > 0 && (
            <Stack spacing={3}>
              <LatestCard latest={latest} t={t} lang={lang} />
              <Tabs
                value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile
                sx={{ borderBottom: '1px solid rgba(255,255,255,0.08)', '& .MuiTab-root': { color: 'var(--tn-text-3)', textTransform: 'none', fontWeight: 700 }, '& .Mui-selected': { color: '#f9ca24 !important' }, '& .MuiTabs-indicator': { bgcolor: '#f9ca24' } }}
              >
                {TABS.map((k) => <Tab key={k} value={k} label={t(`lotto.tab_${k}`)} />)}
              </Tabs>
              {tab === 'history' && <HistoryTab draws={draws} t={t} />}
              {tab === 'stats' && <StatsTab draws={draws} t={t} />}
              {tab === 'check' && <CheckTab draws={draws} t={t} initial={checkNumbers} />}
              {tab === 'generate' && <GenerateTab t={t} onCheck={(g) => { setCheckNumbers(g); setTab('check'); }} />}
              <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.72rem' }}>{t('lotto.source_note')}</Typography>
            </Stack>
          )}
        </Container>
      </Box>
    </>
  );
};

export default LottoPage;
