import { 
  Button,
  Typography,
  Box,
  Stack,
  Checkbox,
  FormControlLabel,
  Divider
} from '@mui/material';

const UserProfileView = ({ userId, onBack }) => {
  return (
    <Stack spacing={3}>
      <Button 
        variant="outlined" 
        onClick={onBack}
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Back to Circle
      </Button>

      <Typography variant="h4">{profile.name}</Typography>
      <Typography variant="body1">Email: {profile.email}</Typography>
      
      <Divider />

      <Typography variant="h6">Circles Membership</Typography>
      <Stack spacing={1}>
        {profile.circles.map(circle => (
          <FormControlLabel
            key={circle.id}
            control={<Checkbox defaultChecked disabled />}
            label={circle.name}
          />
        ))}
      </Stack>

      <Button 
        variant="contained" 
        onClick={() => alert('Save changes')}
        sx={{ mt: 2 }}
      >
        Save Changes
      </Button>
    </Stack>
  );
};

export default UserProfileView;
