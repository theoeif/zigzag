import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  Button, 
  List, 
  ListItem, 
  ListItemAvatar, 
  ListItemText, 
  Avatar, 
  useMediaQuery,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  FormControlLabel,
  Chip
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import LabelIcon from '@mui/icons-material/Label';
import EditIcon from '@mui/icons-material/Edit';
import { 
  fetchCircleMembers, 
  fetchProfiles, 
  fetchUserProfile,
  addFriendsToCircle,
  removeFriendsFromCircle,
  deleteCircle,
  updateCircle,
  fetchMyTags
} from '../../api/api';

const AddFriendsModal = ({ open, onClose, onAdd, circle, existingMembers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [friends, setFriends] = useState([]);
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadFriends = async () => {
      setLoading(true);
      try {
        const data = await fetchProfiles();
        // Filter out existing members using username
        const existingMemberUsernames = existingMembers.map(member => member.username);
        const availableFriends = data.filter(friend => 
          !existingMemberUsernames.includes(friend.username)
        );
        setFriends(availableFriends);
      } catch (error) {
        console.error('Error loading friends:', error);
      }
      setLoading(false);
    };

    if (open) {
      loadFriends();
      setSelectedFriends([]); // Reset selections when modal opens
    }
  }, [open, existingMembers]);

  const filteredFriends = friends.filter(friend =>
    `${friend.first_name} ${friend.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFriendSelection = (friend) => {
    setSelectedFriends(prev => {
      const isSelected = prev.some(f => f.username === friend.username);
      if (isSelected) {
        return prev.filter(f => f.username !== friend.username);
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleAdd = async () => {
    try {
      await addFriendsToCircle(circle.id, selectedFriends);
      onAdd();
      onClose();
    } catch (error) {
      console.error('Error adding friends:', error);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      classes={{ paper: 'addFriendsDialog' }}
    >
      <DialogTitle className="addFriendsTitle">Add Friends to Circle</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Search friends"
          type="text"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />
        {loading ? (
          <Typography>Loading friends...</Typography>
        ) : filteredFriends.length === 0 ? (
          <Typography>No available friends to add</Typography>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredFriends.map((friend) => {
              const isSelected = selectedFriends.some(f => f.username === friend.username);
              return (
                <ListItem 
                  key={friend.username} 
                  dense 
                  button
                  onClick={() => toggleFriendSelection(friend)}
                  className="friendItem"
                  sx={{ 
                    width: '100%', 
                    bgcolor: isSelected ? 'rgba(25, 118, 210, 0.08)' : 'transparent',
                    '&:hover': {
                      bgcolor: isSelected ? 'rgba(25, 118, 210, 0.12)' : 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <Checkbox
                    edge="start"
                    checked={isSelected}
                    tabIndex={-1}
                    disableRipple
                    className="memberCheckbox"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFriendSelection(friend);
                    }}
                  />
                  <ListItemText
                    primary={`${friend.first_name} ${friend.last_name}`}
                    secondary={`@${friend.username}`}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleAdd}
          disabled={selectedFriends.length === 0}
          variant="contained"
          className="addFriendsConfirm"
        >
          Add Selected Friends ({selectedFriends.length})
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// New component for editing circle tags
const EditTagsModal = ({ open, onClose, onUpdate, circle }) => {
  const [allTags, setAllTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadTags = async () => {
      setLoading(true);
      try {
        const tagsData = await fetchMyTags();
        setAllTags(tagsData);
        
        // Initialize selected tags from circle
        if (circle && circle.categories) {
          setSelectedTags(
            tagsData.filter(tag => 
              circle.categories.includes(tag.name)
            )
          );
        }
      } catch (err) {
        console.error('Error loading tags:', err);
        setError('Failed to load categories');
      }
      setLoading(false);
    };

    if (open) {
      loadTags();
    }
  }, [open, circle]);

  const toggleTagSelection = (tag) => {
    setSelectedTags(prev => {
      const isSelected = prev.some(t => t.id === tag.id);
      if (isSelected) {
        return prev.filter(t => t.id !== tag.id);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleUpdate = async () => {
    if (selectedTags.length === 0) {
      setError('At least one category is required');
      return;
    }
    
    try {
      const updatedData = {
        categories: selectedTags.map(tag => tag.name)
      };
      
      await onUpdate(updatedData);
      onClose();
    } catch (err) {
      console.error('Error updating tags:', err);
      setError('Failed to update categories');
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>Edit Tags</DialogTitle>
      <DialogContent>
        {loading ? (
          <Typography>Loading categories...</Typography>
        ) : (
          <>
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
            )}
            <Typography variant="body2" sx={{ mb: 2 }}>
              Select categories for this circle. At least one category is required.
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {allTags.map(tag => {
                const isSelected = selectedTags.some(t => t.id === tag.id);
                return (
                  <Chip
                    key={tag.id}
                    icon={<LabelIcon />}
                    label={tag.name}
                    clickable
                    onClick={() => toggleTagSelection(tag)}
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    sx={{ 
                      m: 0.5,
                      borderRadius: '16px',
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.2)' : undefined,
                      fontWeight: isSelected ? 'bold' : 'normal',
                      transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.3)' : 'rgba(0, 0, 0, 0.08)',
                      }
                    }}
                  />
                );
              })}
            </Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
              Selected: {selectedTags.length}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleUpdate}
          disabled={selectedTags.length === 0 || loading}
          variant="contained"
        >
          Update
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const CircleDetailsView = ({ circle, onSelectUser, onCircleDeleted }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [members, setMembers] = useState([]);
  const [isAddFriendsModalOpen, setIsAddFriendsModalOpen] = useState(false);
  const [isEditTagsModalOpen, setIsEditTagsModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [localCircle, setLocalCircle] = useState(null);

  // Log circle data to ensure categories are accessible
  useEffect(() => {
    if (circle) {
      console.log('Circle data in CircleDetailsView:', circle);
      setLocalCircle(circle);
    }
  }, [circle]);

  const loadMembers = async () => {
    if (circle) {
      try {
        const data = await fetchCircleMembers(circle.id);
        if (data) setMembers(data);
      } catch (error) {
        console.error('Error fetching members:', error);
      }
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeView = async () => {
      if (circle) {
        try {
          // Load circle members
          const membersData = await fetchCircleMembers(circle.id);
          if (isMounted && membersData) setMembers(membersData);

          // Load current user profile
          const userProfile = await fetchUserProfile();
          if (isMounted && userProfile) {
            setCurrentUser(userProfile);
            setIsCreator(circle.creator === userProfile.username);
          }
        } catch (error) {
          console.error('Error initializing view:', error);
        }
      }
    };

    initializeView();
    return () => { isMounted = false };
  }, [circle]);

  const handleRemoveMember = async (memberId) => {
    try {
      if (memberId) {
        await removeFriendsFromCircle(circle.id, [memberId]);
        loadMembers();
      } else {
        console.error('Cannot remove member: ID is undefined');
      }
    } catch (error) {
      console.error('Error removing member:', error);
    }
  };

  const handleDeleteCircle = async () => {
    try {
      await deleteCircle(circle.id);
      // Clear local circle state to show the empty state immediately
      setLocalCircle(null);
      // Close the menu if it's open
      setAnchorEl(null);
      // Call the parent's callback
      if (onCircleDeleted) onCircleDeleted();
    } catch (error) {
      console.error('Error deleting circle:', error);
    }
  };

  const handleUpdateTags = async (updatedData) => {
    try {
      const updatedCircle = await updateCircle(circle.id, updatedData);
      
      // Update local state immediately for better UX
      setLocalCircle({
        ...circle,
        categories: updatedData.categories
      });
      
      // Create a custom event to force CirclesSidebar to refresh
      const event = new CustomEvent('refreshCircles');
      window.dispatchEvent(event);
      
      return updatedCircle;
    } catch (error) {
      console.error('Error updating circle tags:', error);
      throw error;
    }
  };

  const canManageMembers = isCreator || circle?.is_shared;

  return (
    <Box sx={{ p: 2 }}>
      {!localCircle && (
        <Box className="emptyStateContainer" sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          minHeight: '60vh'
        }}>
          <Typography variant="h6" className="emptyStateTitle" gutterBottom>
            {isMobile ? 'Tap "Circles" above' : 'Select a Circle'}
          </Typography>
          <Typography variant="body1" className="emptyStateText" color="text.secondary">
            {isMobile ? 'Choose a circle from the menu' : 'Select a circle from the sidebar'}
          </Typography>
        </Box>
      )}

      {localCircle && (
        <Box sx={{ height: '100%' }}>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box>
              <Typography variant="h5" component="div" className="circleTitle">
                {localCircle.name}
              </Typography>
              <Typography variant="subtitle1" className="circleSubtitle" color="text.secondary">
                Created by {localCircle.creator} 
                <br />
                {members.length} members • {localCircle.is_shared ? 'Shared' : 'Private'} Circle
              </Typography>
              {/* Display categories as tags */}
              {localCircle.categories && localCircle.categories.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {localCircle.categories.map((category, index) => (
                    <Chip
                      key={index}
                      icon={<LabelIcon />}
                      label={category}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ 
                        borderRadius: '16px',
                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                        '& .MuiChip-icon': {
                          color: 'primary.main',
                        }
                      }}
                    />
                  ))}
                </Box>
              )}
            </Box>
            
            {isCreator && (
              <IconButton onClick={(e) => setAnchorEl(e.currentTarget)} className="moreOptions">
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={() => setAnchorEl(null)}
          >
            <MenuItem 
              onClick={() => {
                setAnchorEl(null);
                setIsEditTagsModalOpen(true);
              }} 
              className="editTagsMenuItem"
            >
              <EditIcon sx={{ mr: 1 }} />
              Edit Tags
            </MenuItem>
            <MenuItem onClick={handleDeleteCircle} className="deleteMenuItem">
              <DeleteIcon sx={{ mr: 1 }} />
              Delete Circle
            </MenuItem>
          </Menu>

          <List className="circleMembers" sx={{ overflow: 'auto', maxHeight: '60vh', pr: 1 }}>
            {members.map((member) => (
              <ListItem 
                key={member.username}
                className="circleMemberItem"
                secondaryAction={
                  (isCreator || (circle.is_shared && member.username === currentUser?.username)) && (
                    <IconButton 
                      edge="end" 
                      aria-label="delete"
                      onClick={() => handleRemoveMember(member.id)}
                      className="deleteIcon"
                    >
                      <DeleteIcon />
                    </IconButton>
                  )
                }
                sx={{ 
                  borderRadius: 2,
                  mb: 0.5,
                  '&:hover': { 
                    bgcolor: 'action.hover',
                    transform: 'translateX(4px)'
                  },
                  transition: 'transform 0.2s ease'
                }}
              >
                <ListItemAvatar>
                  <Avatar className="circleMemberAvatar" sx={{ bgcolor: 'primary.main' }}>
                    {member.first_name?.[0]}{member.last_name?.[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={`${member.first_name} ${member.last_name}`}
                  secondary={`@${member.username}${member.username === currentUser?.username ? ' (You)' : ''}`}
                  onClick={() => onSelectUser(member)}
                  sx={{ cursor: 'pointer' }}
                />
              </ListItem>
            ))}
          </List>

          {canManageMembers && (
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                className="circleAddButton"
                sx={{ borderRadius: 20 }}
                onClick={() => setIsAddFriendsModalOpen(true)}
              >
                Add Friend to Circle
              </Button>
            </Box>
          )}

          <AddFriendsModal
            open={isAddFriendsModalOpen}
            onClose={() => setIsAddFriendsModalOpen(false)}
            onAdd={loadMembers}
            circle={circle}
            existingMembers={members}
          />

          <EditTagsModal
            open={isEditTagsModalOpen}
            onClose={() => setIsEditTagsModalOpen(false)}
            onUpdate={handleUpdateTags}
            circle={localCircle}
          />
        </Box>
      )}
    </Box>
  );
};

export default CircleDetailsView;