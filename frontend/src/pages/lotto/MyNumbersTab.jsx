import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Box, Button, Chip, CircularProgress, IconButton, Stack, Switch, TextField, Typography } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useAuth } from '../../context/AuthContext';
import { fetchWithAccessRaw } from '../../util/fetchUtil';
import { BallRow, NumberPicker, Panel } from './LottoParts';
import { pickNumbers, saveTicket } from './lottoUtils';

const rankLabel = (rank, t) => (rank > 0 ? t('lotto.rank', { r: rank }) : t('lotto.my_lost'));

const AlertList = ({ alerts, t }) => (
  <Stack spacing={1}>
    {alerts.map((a) => (
      <Stack key={a.drwNo} direction="row" alignItems="center" spacing={1.2}>
        <Chip
          size="small" label={rankLabel(a.bestRank, t)}
          sx={{ height: 22, minWidth: 48, fontSize: '0.72rem', fontWeight: 700, bgcolor: a.bestRank > 0 ? '#f9ca24' : 'rgba(255,255,255,0.08)', color: a.bestRank > 0 ? '#000' : 'var(--tn-text-2)' }}
        />
        <Typography sx={{ fontSize: '0.85rem', color: a.read ? 'var(--tn-text-2)' : 'var(--tn-text)', fontWeight: a.read ? 400 : 700 }}>
          {t('lotto.my_alert_line', { no: a.drwNo, total: a.ticketCount, win: a.winCount })}
        </Typography>
      </Stack>
    ))}
  </Stack>
);

const MyNumbersTab = ({ t }) => {
  const { isLoggedIn } = useAuth();
  const [data, setData] = useState(null);
  const [picked, setPicked] = useState([]);
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchWithAccessRaw('/api/lotto/my');
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    load().catch(() => {});
    // 이 탭을 열면 알림을 본 것으로 처리
    fetchWithAccessRaw('/api/lotto/my/alerts/read', { method: 'POST' })
      .then(() => window.dispatchEvent(new Event('lotto-alerts-read')))
      .catch(() => {});
  }, [isLoggedIn, load]);

  if (!isLoggedIn) {
    return (
      <Panel sx={{ textAlign: 'center', py: 6 }}>
        <Typography sx={{ fontWeight: 700, mb: 1 }}>{t('lotto.my_login_title')}</Typography>
        <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.88rem', mb: 2.5 }}>{t('lotto.my_login_desc')}</Typography>
        <Button component={Link} to={`/login?redirect=${encodeURIComponent('/lotto?tab=my')}`} variant="contained">{t('header.login')}</Button>
      </Panel>
    );
  }
  if (!data) return <Box sx={{ py: 8, textAlign: 'center' }}><CircularProgress sx={{ color: '#f9ca24' }} /></Box>;

  const toggle = (n) => setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < 6 ? [...p, n].sort((a, b) => a - b) : p));

  const add = async () => {
    setBusy(true);
    const err = await saveTicket(picked, label, t);
    setBusy(false);
    setMessage(err || t('lotto.my_saved'));
    if (!err) { setPicked([]); setLabel(''); await load(); }
  };

  const remove = async (id) => {
    await fetchWithAccessRaw(`/api/lotto/my/tickets/${id}`, { method: 'DELETE' });
    await load();
  };

  const setEmail = async (on) => {
    setData((d) => ({ ...d, emailOn: on }));
    await fetchWithAccessRaw('/api/lotto/my/email', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ on }),
    });
  };

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '440px 1fr' }, gap: 2 }}>
      <Stack spacing={2}>
        <Panel>
          <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{t('lotto.my_add_title')}</Typography>
          <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.8rem', mb: 2 }}>{t('lotto.my_add_desc')}</Typography>
          <NumberPicker state={(n) => (picked.includes(n) ? 'on' : 'off')} onToggle={toggle} />
          <TextField
            size="small" fullWidth value={label} onChange={(e) => setLabel(e.target.value)}
            inputProps={{ maxLength: 30 }} placeholder={t('lotto.my_label')} sx={{ mt: 2 }}
          />
          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button variant="contained" disabled={picked.length !== 6 || busy} onClick={add}>{t('lotto.my_save')}</Button>
            <Button variant="outlined" color="inherit" onClick={() => setPicked(pickNumbers())}>{t('lotto.random_fill')}</Button>
          </Stack>
          {message && <Typography role="status" sx={{ color: 'var(--tn-text-2)', fontSize: '0.8rem', mt: 1.2 }}>{message}</Typography>}
        </Panel>

        <Panel>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: '0.92rem' }}>{t('lotto.my_email_title')}</Typography>
              <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.78rem' }}>
                {!data.emailAvailable ? t('lotto.my_email_off') : !data.hasEmail ? t('lotto.my_email_none') : t('lotto.my_email_desc')}
              </Typography>
            </Box>
            <Switch
              checked={data.emailOn} disabled={!data.emailAvailable || !data.hasEmail}
              onChange={(e) => setEmail(e.target.checked)} inputProps={{ 'aria-label': t('lotto.my_email_title') }}
            />
          </Stack>
        </Panel>
      </Stack>

      <Stack spacing={2}>
        <Panel>
          <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{t('lotto.my_alerts_title')}</Typography>
          {data.alerts.length
            ? <AlertList alerts={data.alerts} t={t} />
            : <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.85rem' }}>{t('lotto.my_alerts_empty')}</Typography>}
        </Panel>

        <Panel>
          <Stack direction="row" justifyContent="space-between" alignItems="baseline" sx={{ mb: 1.5 }}>
            <Typography sx={{ fontWeight: 700 }}>{t('lotto.my_list_title')}</Typography>
            <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.75rem' }}>{data.tickets.length}/{data.maxTickets}</Typography>
          </Stack>
          {data.tickets.length === 0 && <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.85rem' }}>{t('lotto.my_list_empty')}</Typography>}
          <Stack spacing={1.5}>
            {data.tickets.map((tk) => (
              <Stack key={tk.id} direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
                <Box sx={{ flex: 1, minWidth: 220 }}>
                  {tk.label && <Typography sx={{ color: 'var(--tn-text-2)', fontSize: '0.76rem', mb: 0.4 }}>{tk.label}</Typography>}
                  <BallRow numbers={tk.numbers} size={32} />
                </Box>
                {tk.latestRank != null && (
                  <Typography sx={{ fontSize: '0.76rem', color: tk.latestRank > 0 ? '#f9ca24' : 'var(--tn-text-3)' }}>
                    {t('lotto.my_latest')} {rankLabel(tk.latestRank, t)}
                  </Typography>
                )}
                <IconButton size="small" aria-label={t('lotto.my_delete')} onClick={() => remove(tk.id)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
        </Panel>
      </Stack>
    </Box>
  );
};

export default MyNumbersTab;
