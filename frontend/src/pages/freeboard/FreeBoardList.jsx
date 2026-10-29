import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAccess } from '../../util/fetchUtil';
import { Helmet } from 'react-helmet-async';
import {
  Box,
  Container,
  Typography,
  Button,
  Stack,
  Chip,
  Pagination,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

/* ── 공통 다크 인풋 스타일 ── */
const darkSx = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    color: '#f4f4f5',
    '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
    '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.22)' },
    '&.Mui-focused fieldset': { borderColor: 'var(--tn-tape)' },
  },
  '& .MuiInputLabel-root': { color: 'var(--tn-text-3)' },
  '& .MuiInputLabel-root.Mui-focused': { color: 'var(--tn-tape)' },
  '& .MuiSelect-icon': { color: 'var(--tn-text-3)' },
};

const FreeBoardList = () => {
  const [data, setData] = useState({ dtoList: [], pageList: [], page: 1, totalPage: 1 });
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const page = parseInt(searchParams.get('page')) || 1;
  const type = searchParams.get('type') || 'tcw';
  const keyword = searchParams.get('keyword') || '';

  const [searchType, setSearchType] = useState(type);
  const [searchKeyword, setSearchKeyword] = useState(keyword);

  useEffect(() => { fetchData(page, type, keyword); }, [page, type, keyword]);

  const fetchData = async (pageNum, sType, sKeyword) => {
    try {
      let url = `${BACKEND_API_BASE_URL}/freeboard?page=${pageNum}&size=10`;
      if (sType && sKeyword && sKeyword.trim() !== '') {
        url += `&type=${sType}&keyword=${encodeURIComponent(sKeyword)}`;
      }
      const res = await fetchWithAccess(url, { method: 'GET' });
      if (!res.ok) throw new Error('Failed to fetch');
      setData(await res.json());
    } catch (e) { console.error(e); }
  };

  const handlePageChange = (_, value) => {
    const params = new URLSearchParams();
    params.set('page', value);
    if (type) params.set('type', type);
    if (keyword) params.set('keyword', keyword);
    setSearchParams(params);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    params.set('page', '1');
    if (searchType) params.set('type', searchType);
    if (searchKeyword.trim()) params.set('keyword', searchKeyword);
    setSearchParams(params);
  };

  const handleResetSearch = () => {
    setSearchType('tcw');
    setSearchKeyword('');
    setSearchParams({ page: '1' });
  };

  return (
    <>
      <Helmet>
        <title>자유게시판 - TerminalNexus | 개발자 커뮤니티</title>
        <meta name="description" content="TerminalNexus 개발자 커뮤니티 자유게시판. 기술 질문, 정보 공유, 프로젝트 협업 등 다양한 주제로 소통하세요." />
        <link rel="canonical" href="https://tnhub.kr/freeboard" />
      </Helmet>

      <Box sx={{ minHeight: '100vh', bgcolor: 'var(--tn-bg)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
        {/* 배경 글로우 */}
        <Box sx={{
          position: 'absolute', top: '5%', left: '60%',
          width: '40vw', height: '40vw', maxWidth: 500, maxHeight: 500,
          background: 'radial-gradient(circle, rgba(242,194,48,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />

        <Container maxWidth="lg" sx={{ pt: { xs: 12, md: 14 }, pb: 10, position: 'relative', zIndex: 1 }}>
          {/* 헤더 */}
          <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={5}>
            <Box>
              <Typography
                variant="h3" component="h1" fontWeight={800}
                sx={{ color: '#f4f4f5', letterSpacing: '-1.5px', fontSize: { xs: '2rem', md: '2.4rem' } }}
              >
                자유게시판
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              onClick={() => navigate('/freeboard/register')}
              sx={{
                px: 3, py: 1.4, borderRadius: '10px',
                bgcolor: 'var(--tn-tape)', color: 'var(--tn-tape-ink)', fontWeight: 700,
                textTransform: 'none', fontSize: '0.88rem',
                
                '&:hover': { bgcolor: 'var(--tn-tape-hover)', transform: 'translateY(-1px)' },
                transition: 'all 0.2s',
              }}
            >
              글쓰기
            </Button>
          </Box>

          {/* 검색 */}
          <Box
            component="form"
            onSubmit={handleSearch}
            sx={{
              p: 3, mb: 4, borderRadius: '16px',
              border: '1px solid rgba(255,255,255,0.07)',
              bgcolor: 'rgba(255,255,255,0.02)',
            }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel sx={{ color: 'var(--tn-text-3)', '&.Mui-focused': { color: 'var(--tn-tape)' } }}>검색 조건</InputLabel>
                <Select
                  value={searchType}
                  label="검색 조건"
                  onChange={(e) => setSearchType(e.target.value)}
                  sx={{
                    ...darkSx['& .MuiOutlinedInput-root'],
                    borderRadius: '10px',
                    color: '#f4f4f5',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.22)' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'var(--tn-tape)' },
                    '& .MuiSelect-icon': { color: 'var(--tn-text-3)' },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: { bgcolor: '#111116', border: '1px solid rgba(255,255,255,0.08)', color: '#f4f4f5' }
                    }
                  }}
                >
                  {[
                    { value: 'tcw', label: '제목+내용+작성자' },
                    { value: 'tc', label: '제목+내용' },
                    { value: 't', label: '제목만' },
                    { value: 'c', label: '내용만' },
                    { value: 'w', label: '작성자만' },
                  ].map(({ value, label }) => (
                    <MenuItem key={value} value={value} sx={{ '&:hover': { bgcolor: 'rgba(242,194,48,0.08)' } }}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="검색어"
                variant="outlined"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="검색어를 입력하세요"
                sx={darkSx}
              />

              <Stack direction="row" spacing={1.5} flexShrink={0}>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={<SearchIcon />}
                  sx={{
                    px: 2.5, height: 56, borderRadius: '10px',
                    bgcolor: 'var(--tn-tape)', color: 'var(--tn-tape-ink)', fontWeight: 600,
                    whiteSpace: 'nowrap', textTransform: 'none',
                    '&:hover': { bgcolor: 'var(--tn-tape)' },
                  }}
                >
                  검색
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleResetSearch}
                  sx={{
                    px: 2.5, height: 56, borderRadius: '10px',
                    borderColor: 'rgba(255,255,255,0.1)', color: 'var(--tn-text-2)',
                    whiteSpace: 'nowrap', textTransform: 'none',
                    '&:hover': { borderColor: 'rgba(255,255,255,0.25)', bgcolor: 'rgba(255,255,255,0.04)' },
                  }}
                >
                  초기화
                </Button>
              </Stack>
            </Stack>
          </Box>

          {/* 테이블 헤더 */}
          <Box
            sx={{
              display: { xs: 'none', md: 'grid' },
              gridTemplateColumns: '80px 1fr 130px 120px 80px',
              px: 3, py: 1.5,
              borderRadius: '10px 10px 0 0',
              bgcolor: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderBottom: 'none',
            }}
          >
            {['번호', '제목', '작성자', '작성일', '조회'].map((label) => (
              <Typography key={label} sx={{ color: 'var(--tn-text-3)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                {label}
              </Typography>
            ))}
          </Box>

          {/* 게시글 목록 */}
          <Box sx={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: '0 0 14px 14px', overflow: 'hidden' }}>
            {data.dtoList && data.dtoList.length > 0 ? (
              data.dtoList.map((dto, idx) => (
                <Box
                  key={dto.id}
                  onClick={() => navigate(`/freeboard/${dto.id}`)}
                  sx={{
                    display: { xs: 'flex', md: 'grid' },
                    flexWrap: 'wrap', columnGap: 1.5, rowGap: 0.6, alignItems: 'baseline',
                    gridTemplateColumns: '80px 1fr 130px 120px 80px',
                    px: { xs: 2, md: 3 }, py: 2,
                    cursor: 'pointer',
                    bgcolor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                    borderTop: idx === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)',
                    '&:hover': { bgcolor: 'rgba(242,194,48,0.05)' },
                    transition: 'background-color 0.15s',
                  }}
                >
                  <Typography sx={{ display: { xs: 'none', md: 'block' }, color: 'var(--tn-text-3)', fontSize: '0.82rem' }}>{dto.id}</Typography>
                  <Typography sx={{ flexBasis: { xs: '100%', md: 'auto' }, minWidth: 0, color: 'var(--tn-text)', fontSize: { xs: '0.95rem', md: '0.9rem' }, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', pr: { xs: 0, md: 2 } }}>
                    {dto.title}
                    {dto.commentCount > 0 && <Box component="span" sx={{ color: 'var(--tn-tape)', fontFamily: 'var(--tn-mono)', fontSize: '0.8rem', ml: 0.7 }}>[{dto.commentCount}]</Box>}
                  </Typography>
                  <Typography sx={{ color: 'var(--tn-text-2)', fontSize: { xs: '0.78rem', md: '0.82rem' } }}>{dto.writerNickname}</Typography>
                  <Typography sx={{ color: 'var(--tn-text-3)', fontSize: { xs: '0.76rem', md: '0.8rem' } }}>{new Date(dto.regDate).toLocaleDateString()}</Typography>
                  <Typography sx={{ color: 'var(--tn-text-3)', fontSize: { xs: '0.76rem', md: '0.8rem' } }}>
                    <Box component="span" sx={{ display: { md: 'none' } }}>조회 </Box>{dto.viewCount}
                  </Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ py: 8, textAlign: 'center' }}>
                <Typography sx={{ color: 'var(--tn-text-3)', fontSize: '0.9rem' }}>
                  {keyword ? `'${keyword}'에 대한 검색 결과가 없습니다.` : '등록된 게시글이 없습니다.'}
                </Typography>
              </Box>
            )}
          </Box>

          {/* 페이지네이션 */}
          <Box display="flex" justifyContent="center" mt={5}>
            <Pagination
              count={data.totalPage || 1}
              page={page}
              onChange={handlePageChange}
              sx={{
                '& .MuiPaginationItem-root': {
                  color: 'var(--tn-text-3)',
                  borderColor: 'rgba(255,255,255,0.08)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                  '&.Mui-selected': { bgcolor: 'var(--tn-tape)', color: 'var(--tn-tape-ink)', borderColor: 'var(--tn-tape)' },
                },
              }}
            />
          </Box>
        </Container>
      </Box>
    </>
  );
};

export default FreeBoardList;
