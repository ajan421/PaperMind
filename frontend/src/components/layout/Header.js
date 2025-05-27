import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import { Login, PersonAdd } from '@mui/icons-material';

const Header = () => {
  return (
    <AppBar position="static" color="inherit" elevation={0} sx={{ borderBottom: '1px solid #eee' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <img src="/logo192.png" alt="logo" style={{ height: 36, marginRight: 12 }} />
          <Typography variant="h6" color="primary" sx={{ fontWeight: 700, letterSpacing: 1 }}>
            PaperMind
          </Typography>
        </Box>
        <Box>
          <Button color="inherit">Pricing</Button>
          <Button color="inherit" startIcon={<Login />}>Login</Button>
          <Button variant="contained" color="primary" startIcon={<PersonAdd />} sx={{ ml: 1, borderRadius: 2 }}>
            Sign up
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 