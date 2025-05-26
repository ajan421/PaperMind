import React from 'react';
import { Box, Typography, Paper } from '@mui/material';
import SearchBar from '../components/common/SearchBar';
import PopularTools from '../components/home/PopularTools';

const Home = () => {
  return (
    <Box component="main" sx={{ flexGrow: 1, bgcolor: '#fafbfc', minHeight: '100vh' }}>
      {/* Hero Section */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 8, mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, textAlign: 'center' }}>
          The Fastest Research Platform Ever
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4, textAlign: 'center' }}>
          All-in-one AI tools for students and researchers.
        </Typography>
        <Paper elevation={2} sx={{ p: 2 }}>
          <SearchBar />
        </Paper>
      </Box>
      <PopularTools />
    </Box>
  );
};

export default Home; 