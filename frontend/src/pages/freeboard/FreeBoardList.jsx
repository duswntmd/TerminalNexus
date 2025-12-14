import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchWithAccess } from '../../util/fetchUtil';
import { 
    Container, 
    Typography, 
    Button, 
    Table, 
    TableBody, 
    TableCell, 
    TableContainer, 
    TableHead, 
    TableRow, 
    Paper, 
    Box, 
    Pagination,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Stack
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import SearchIcon from '@mui/icons-material/Search';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardList = () => {
    const [data, setData] = useState({ dtoList: [], pageList: [], page: 1, totalPage: 1 });
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    
    const page = parseInt(searchParams.get("page")) || 1;
    const type = searchParams.get("type") || "tcw";
    const keyword = searchParams.get("keyword") || "";
    
    const [searchType, setSearchType] = useState(type);
    const [searchKeyword, setSearchKeyword] = useState(keyword);

    useEffect(() => {
        fetchData(page, type, keyword);
    }, [page, type, keyword]);

    const fetchData = async (pageNum, searchType, searchKeyword) => {
        try {
            let url = `${BACKEND_API_BASE_URL}/freeboard?page=${pageNum}&size=10`;
            
            if (searchType && searchKeyword && searchKeyword.trim() !== '') {
                url += `&type=${searchType}&keyword=${encodeURIComponent(searchKeyword)}`;
            }
            
            const res = await fetchWithAccess(url, {
                method: 'GET'
            });
            if (!res.ok) throw new Error("Failed to fetch");
            const result = await res.json();
            setData(result);
        } catch (e) {
            console.error(e);
        }
    };

    const handlePageChange = (event, value) => {
        const params = new URLSearchParams();
        params.set('page', value);
        if (type) params.set('type', type);
        if (keyword) params.set('keyword', keyword);
        setSearchParams(params);
    };

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams();
        params.set('page', '1'); // 검색 시 1페이지로 이동
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
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    자유게시판
                </Typography>
                <Button 
                    variant="contained" 
                    color="primary" 
                    startIcon={<EditIcon />}
                    onClick={() => navigate('/freeboard/register')}
                >
                    글쓰기
                </Button>
            </Box>

            {/* 검색 영역 */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <form onSubmit={handleSearch}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <FormControl sx={{ minWidth: 150 }}>
                            <InputLabel>검색 조건</InputLabel>
                            <Select
                                value={searchType}
                                label="검색 조건"
                                onChange={(e) => setSearchType(e.target.value)}
                            >
                                <MenuItem value="tcw">제목+내용+작성자</MenuItem>
                                <MenuItem value="tc">제목+내용</MenuItem>
                                <MenuItem value="t">제목만</MenuItem>
                                <MenuItem value="c">내용만</MenuItem>
                                <MenuItem value="w">작성자만</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <TextField
                            fullWidth
                            label="검색어"
                            variant="outlined"
                            value={searchKeyword}
                            onChange={(e) => setSearchKeyword(e.target.value)}
                            placeholder="검색어를 입력하세요"
                        />
                        
                        <Button 
                            type="submit"
                            variant="contained" 
                            color="primary"
                            startIcon={<SearchIcon />}
                            sx={{ minWidth: 100, height: 56 }}
                        >
                            검색
                        </Button>
                        
                        <Button 
                            variant="outlined"
                            onClick={handleResetSearch}
                            sx={{ minWidth: 100, height: 56 }}
                        >
                            초기화
                        </Button>
                    </Stack>
                </form>
            </Paper>

            <TableContainer component={Paper} elevation={3}>
                <Table sx={{ minWidth: 650 }} aria-label="freeboard table">
                    <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
                        <TableRow>
                            <TableCell align="center" width="10%">번호</TableCell>
                            <TableCell align="center" width="50%">제목</TableCell>
                            <TableCell align="center" width="15%">작성자</TableCell>
                            <TableCell align="center" width="15%">작성일</TableCell>
                            <TableCell align="center" width="10%">조회수</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.dtoList && data.dtoList.length > 0 ? (
                            data.dtoList.map((dto) => (
                                <TableRow 
                                    key={dto.id} 
                                    hover 
                                    sx={{ '&:last-child td, &:last-child th': { border: 0 }, cursor: 'pointer' }}
                                    onClick={() => navigate(`/freeboard/${dto.id}`)}
                                >
                                    <TableCell component="th" scope="row" align="center">
                                        {dto.id}
                                    </TableCell>
                                    <TableCell align="left">
                                        {dto.title}
                                    </TableCell>
                                    <TableCell align="center">{dto.writerNickname}</TableCell>
                                    <TableCell align="center">{new Date(dto.regDate).toLocaleDateString()}</TableCell>
                                    <TableCell align="center">{dto.viewCount}</TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center" sx={{ py: 5 }}>
                                    <Typography variant="body1" color="textSecondary">
                                        {keyword ? `'${keyword}'에 대한 검색 결과가 없습니다.` : '등록된 게시글이 없습니다.'}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box display="flex" justifyContent="center" mt={4}>
                <Pagination 
                    count={data.totalPage || 1} 
                    page={page} 
                    onChange={handlePageChange} 
                    color="primary" 
                    showFirstButton 
                    showLastButton
                />
            </Box>
        </Container>
    );
};

export default FreeBoardList;
