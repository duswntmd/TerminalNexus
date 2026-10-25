import React from 'react';
import { Box, Typography } from '@mui/material';
import { ballColor } from './lottoUtils';

/** 번호 공 */
export const Ball = ({ n, size = 40, dim = false }) => {
  const c = ballColor(n);
  return (
    <Box
      sx={{
        width: size, height: size, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `radial-gradient(circle at 32% 28%, rgba(255,255,255,0.5) 0%, transparent 50%), ${c}`,
        boxShadow: dim ? 'none' : `0 3px 10px ${c}55, inset 0 -3px 6px rgba(0,0,0,0.25)`,
        opacity: dim ? 0.35 : 1,
      }}
    >
      <Typography sx={{ fontWeight: 800, fontSize: size * 0.4, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.55)' }}>
        {n}
      </Typography>
    </Box>
  );
};

/** 6개 번호 + 보너스 */
export const BallRow = ({ numbers, bonus, size = 40, highlight }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 0.8 }, flexWrap: 'wrap' }}>
    {numbers.map((n) => (
      <Ball key={n} n={n} size={size} dim={highlight ? !highlight.includes(n) : false} />
    ))}
    {bonus != null && (
      <>
        <Typography sx={{ color: '#52525b', fontWeight: 700, mx: 0.3 }}>+</Typography>
        <Ball n={bonus} size={size} dim={highlight ? !highlight.includes(bonus) : false} />
      </>
    )}
  </Box>
);

/**
 * 1~45 선택판
 * state(n): 'on' | 'off' | 'x' (제외)
 */
export const NumberPicker = ({ state, onToggle }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: { xs: 0.5, sm: 0.8 }, maxWidth: 420 }}>
    {Array.from({ length: 45 }, (_, i) => i + 1).map((n) => {
      const s = state(n);
      const c = ballColor(n);
      return (
        <Box
          key={n}
          component="button"
          type="button"
          onClick={() => onToggle(n)}
          aria-pressed={s === 'on'}
          sx={{
            aspectRatio: '1', borderRadius: '50%', cursor: 'pointer', p: 0,
            fontWeight: 700, fontSize: { xs: '0.75rem', sm: '0.85rem' }, fontFamily: 'inherit',
            border: `1.5px solid ${s === 'on' ? c : s === 'x' ? '#3f3f46' : 'rgba(255,255,255,0.12)'}`,
            bgcolor: s === 'on' ? c : 'transparent',
            color: s === 'on' ? '#fff' : s === 'x' ? '#3f3f46' : '#d4d4d8',
            textDecoration: s === 'x' ? 'line-through' : 'none',
            transition: 'all 0.15s',
            '&:hover': { borderColor: c },
          }}
        >
          {n}
        </Box>
      );
    })}
  </Box>
);

export const Panel = ({ children, sx }) => (
  <Box
    sx={{
      p: { xs: 2, md: 3 }, borderRadius: '16px',
      bgcolor: '#0a0a0c', border: '1px solid rgba(255,255,255,0.07)',
      ...sx,
    }}
  >
    {children}
  </Box>
);
