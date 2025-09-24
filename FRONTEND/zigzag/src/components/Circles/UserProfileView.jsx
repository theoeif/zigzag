// import React, { useEffect, useState } from 'react';
// import { fetchProfile } from '../../api/api';

// const UserProfileView = ({ userId, onBack }) => {
//   const [profile, setProfile] = useState(null);

//   useEffect(() => {
//     if (userId) {
//       async function getProfile() {
//         const data = await fetchProfile(userId);
//         if (data) {
//           setProfile(data);
//         }
//       }
//       getProfile();
//     }
//   }, [userId]);

//   if (!profile) {
//     return <div>Loading profile...</div>;
//   }

//   return (
//     <div className="user-profile-view">
//       <button onClick={onBack}>← Back to Circle</button>
//       <h2>User: {profile.name}</h2>
//       <p>Email: {profile.email}</p>
//       <div>
//         <h3>Circles Membership:</h3>
//         {profile.circles && profile.circles.map(circle => (
//           <div key={circle.id}>
//             <label>
//               <input type="checkbox" defaultChecked readOnly />
//               {circle.name}
//             </label>
//           </div>
//         ))}
//       </div>
//       <button onClick={() => alert('Save changes functionality here')}>
//         Save Changes
//       </button>
//     </div>
//   );
// };

// export default UserProfileView;

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
