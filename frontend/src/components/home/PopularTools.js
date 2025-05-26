import React from 'react';
import { Box, Typography, Grid, Card, CardContent } from '@mui/material';
import { Chat, Edit } from '@mui/icons-material';

const tools = [
  {
    title: 'Chat with PDF',
    description: 'Get all answers backed by citations.',
    icon: <Chat color="primary" sx={{ mr: 1 }} />
  },
  {
    title: 'AI Writer',
    description: 'Write new research papers. Assisted by AI.',
    icon: <Edit color="primary" sx={{ mr: 1 }} />
  }
];

const PopularTools = () => {
  return (
    <Box sx={{ px: 4, mb: 6 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>Popular Tools</Typography>
      <Grid container spacing={3}>
        {tools.map((tool, index) => (
          <Grid item xs={12} md={3} key={index}>
            <Card sx={{ minHeight: 120 }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  {tool.icon}
                  <Typography variant="subtitle1" fontWeight={600}>{tool.title}</Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">{tool.description}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default PopularTools; 