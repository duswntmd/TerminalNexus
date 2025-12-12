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
    Pagination 
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

const BACKEND_API_BASE_URL = import.meta.env.VITE_BACKEND_API_BASE_URL;

const FreeBoardList = () => {
    const [data, setData] = useState({ dtoList: [], pageList: [], page: 1, totalPage: 1 });
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const page = parseInt(searchParams.get("page")) || 1;

    useEffect(() => {
        fetchData(page);
    }, [page]);

    const fetchData = async (pageNum) => {
        try {
            const res = await fetchWithAccess(`${BACKEND_API_BASE_URL}/freeboard?page=${pageNum}&size=10`, {
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
        navigate(`/freeboard?page=${value}`);
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
                                        등록된 게시글이 없습니다.
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
