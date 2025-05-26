import React from 'react';
import { Drawer, List, ListItem, ListItemIcon, ListItemText, Box, Toolbar } from '@mui/material';
import { Home, Description, Chat, Apple, Extension, Language } from '@mui/icons-material';

const drawerWidth = 240;

const sidebarItems = [
  { text: 'Home', icon: <Home /> },
  { text: 'Chat with PDF', icon: <Chat /> },
  { text: 'Literature Review', icon: <Description /> },
];

const externalLinks = [
  { text: 'iOS App', icon: <Apple /> },
  { text: 'Chrome Extension', icon: <Extension /> },
  { text: 'Use on ChatGPT', icon: <Language /> },
];

const Sidebar = () => {
  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box', background: '#f7f7f7' },
      }}
    >
      <Toolbar />
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {sidebarItems.map((item) => (
            <ListItem button key={item.text}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
        <Box sx={{ mt: 2 }}>
          <List>
            {externalLinks.map((item) => (
              <ListItem button key={item.text}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Box>
    </Drawer>
  );
};

export default Sidebar; 