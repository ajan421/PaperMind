import React from 'react';
import { TextField, InputAdornment, IconButton, Tabs, Tab, Box, Button, Typography } from '@mui/material';
import { Search } from '@mui/icons-material';

const SearchBar = () => {
  const [tab, setTab] = React.useState(0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 600, maxWidth: '90%' }}>
      <TextField
        fullWidth
        placeholder="Enter your search query"
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton color="primary">
                <Search />
              </IconButton>
            </InputAdornment>
          ),
          sx: { borderRadius: 2, background: '#fff' },
        }}
        sx={{ mb: 2 }}
      />
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="standard"
        sx={{ mb: 1 }}
      >
        <Tab label="Standard" />
        <Tab label="High Quality" />
        <Tab label="Deep Review" />
      </Tabs>
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Button variant="outlined" size="small">How does climate change impact biodiversity?</Button>
        <Button variant="outlined" size="small">Why are aging Covid patients more susceptible to...</Button>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        <b>Introducing Deep-Review</b> - Do systematic literature review in minutes. <a href="#" style={{ color: '#1976d2' }}>Know More</a>
      </Typography>
    </Box>
  );
};

export default SearchBar; 