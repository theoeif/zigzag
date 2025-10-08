import {
  Button,
  Typography,
  Box,
  Stack,
  Checkbox,
  FormControlLabel,
  Divider
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const UserProfileView = ({ userId, onBack }) => {
  // Placeholder data - in a real app, this would be fetched based on userId
  const profile = {
    name: "Utilisateur",
    email: "user@example.com",
    circles: []
  };

  return (
    <Stack spacing={3}>
      <Button
        variant="outlined"
        onClick={onBack}
        startIcon={<ArrowBackIcon />}
        sx={{ alignSelf: 'flex-start' }}
      >
        Retour au Cercle
      </Button>

      <Typography variant="h4">{profile.name}</Typography>
      <Typography variant="body1">Email : {profile.email}</Typography>

      <Divider />

      <Typography variant="h6">Appartenance aux Cercles</Typography>
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
        onClick={() => alert('Sauvegarder les modifications')}
        sx={{ mt: 2 }}
      >
        Sauvegarder les Modifications
      </Button>
    </Stack>
  );
};

export default UserProfileView;
