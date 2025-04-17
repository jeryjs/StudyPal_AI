import React from 'react';
import {
  alpha,
  Box,
  Chip,
  IconButton,
  Typography,
  Card,
  CardContent,
  useTheme
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LightbulbIcon from '@mui/icons-material/Lightbulb';

interface ConceptCardProps {
  id: number;
  title: string;
  description: string;
  subject: string;
  resources: number;
  subjectColor: string;
}

const ConceptCard: React.FC<ConceptCardProps> = ({
  title,
  description,
  subject,
  resources,
  subjectColor
}) => {
  const theme = useTheme();
  return (
    <Card sx={{
      background: alpha(theme.palette.background.paper, 0.5),
      border: `1px solid ${alpha(subjectColor, 0.2)}`,
      borderRadius: '16px',
      boxShadow: `0 10px 30px ${alpha(subjectColor, 0.1)}`
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
          <Chip
            label={subject}
            size="small"
            sx={{
              bgcolor: alpha(subjectColor, 0.15),
              color: subjectColor,
              fontWeight: 500,
              borderRadius: '10px'
            }}
          />
          <IconButton size="small">
            <MoreVertIcon />
          </IconButton>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{description}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Chip
            icon={<LightbulbIcon />}
            label={`${resources} Resources`}
            size="small"
            sx={{
              bgcolor: alpha(theme.palette.info.main, 0.1),
              color: theme.palette.info.main,
              borderRadius: '10px'
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ConceptCard;
