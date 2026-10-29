import { createTheme } from '@mui/material/styles';

// MUI 컴포넌트가 사이트 공통 토큰(index.css)과 같은 색·글꼴을 쓰도록
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#f2c230', contrastText: '#1a1500' },
    secondary: { main: '#79b8ff' },
    success: { main: '#3ddc84' },
    error: { main: '#ff6257' },
    background: { default: '#1d2026', paper: '#262a31' },
    text: { primary: '#eceef1', secondary: '#b3bac5', disabled: '#8c94a1' },
    divider: '#3a404a',
  },
  typography: {
    fontFamily: "'IBM Plex Sans KR', system-ui, -apple-system, 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
    button: { textTransform: 'none', fontWeight: 700 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiButton: { defaultProps: { disableElevation: true } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#3a404a' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#8c94a1' },
        },
      },
    },
  },
});

export default theme;
