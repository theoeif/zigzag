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
  fetchUsers, 
  fetchUserProfile,
  addUsersToCircle,
  removeUsersFromCircle,
  deleteCircle,
  updateCircle,
  fetchMyTags
} from '../../api/api';

const AddUsersModal = ({ open, onClose, onAdd, circle, existingMembers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      try {
        const data = await fetchUsers();
        // Filter out existing members using username
        const existingMemberUsernames = existingMembers.map(member => member.username);
        const availableUsers = data.filter(user => 
          !existingMemberUsernames.includes(user.username)
        );
        setUsers(availableUsers);
      } catch (error) {
        console.error('Error loading users:', error);
      }
      setLoading(false);
    };

    if (open) {
      loadUsers();
      setSelectedUsers([]); // Reset selections when modal opens
    }
  }, [open, existingMembers]);

  const filteredUsers = users.filter(user =>
    `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleUserSelection = (user) => {
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.username === user.username);
      if (isSelected) {
        return prev.filter(u => u.username !== user.username);
      } else {
        return [...prev, user];
      }
    });
  };

  const handleAdd = async () => {
    try {
      await addUsersToCircle(circle.id, selectedUsers);
      onAdd();
      onClose();
    } catch (error) {
      console.error('Error adding users:', error);
    }
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      classes={{ paper: 'addUsersDialog' }}
    >
      <DialogTitle className="addUsersTitle">Add Users to Circle</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Search users"
          type="text"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 2 }}
        />
        {loading ? (
          <Typography>Loading users...</Typography>
        ) : filteredUsers.length === 0 ? (
          <Typography>No available users to add</Typography>
        ) : (
          <List sx={{ maxHeight: 400, overflow: 'auto' }}>
            {filteredUsers.map((user) => {
              const isSelected = selectedUsers.some(u => u.username === user.username);
              return (
                <ListItem 
                  key={user.username} 
                  dense 
                  button
                  onClick={() => toggleUserSelection(user)}
                  className="userItem"
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
                      toggleUserSelection(user);
                    }}
                  />
                  <ListItemText
                    primary={`${user.first_name} ${user.last_name}`}
                    secondary={`@${user.username}`}
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
          disabled={selectedUsers.length === 0}
          variant="contained"
          className="addUsersConfirm"
        >
          Add Selected Users ({selectedUsers.length})
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
        if (circle && circle.tags) {
          setSelectedTags(
            tagsData.filter(tag =>
              circle.tags.includes(tag.name)
            )
          );
        }
      } catch (err) {
        console.error('Error loading tags:', err);
        setError('Failed to load tags');
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
      setError('At least one tag is required');
      return;
    }
    
    try {
      const updatedData = {
        tags: selectedTags.map(tag => tag.name)
      };
      
      await onUpdate(updatedData);
      onClose();
    } catch (err) {
      console.error('Error updating tags:', err);
      setError('Failed to update tags');
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
          <Typography>Loading tags...</Typography>
        ) : (
          <>
            {error && (
              <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
            )}
            <Typography variant="body2" sx={{ mb: 2 }}>
              Select tags for this circle. At least one tag is required.
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
                      backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.15)' : undefined,
                      color: isSelected ? '#1976d2' : 'inherit',
                      fontWeight: isSelected ? '600' : 'normal',
                      transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.2s ease',
                      border: isSelected ? '2px solid #1976d2' : '1px solid #e0e0e0',
                      boxShadow: isSelected ? '0 1px 4px rgba(25, 118, 210, 0.2)' : 'none',
                      '&:hover': {
                        backgroundColor: isSelected ? 'rgba(25, 118, 210, 0.2)' : 'rgba(0, 0, 0, 0.08)',
                        transform: isSelected ? 'scale(1.03)' : 'scale(1.02)',
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
  const [isAddUsersModalOpen, setIsAddUsersModalOpen] = useState(false);
  const [isEditTagsModalOpen, setIsEditTagsModalOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [isCreator, setIsCreator] = useState(false);
  const [localCircle, setLocalCircle] = useState(null);

  // Log circle data to ensure tags are accessible
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
        await removeUsersFromCircle(circle.id, [memberId]);
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
      // updatedData contains the tags array with tag names
      // We need to convert tag names to tag IDs for the backend
      const tagNames = updatedData.tags;
      
      // Get all available tags to find their IDs
      const allTags = await fetchMyTags();
      const tagIds = tagNames.map(tagName => {
        const tag = allTags.find(t => t.name === tagName);
        return tag ? tag.id : null;
      }).filter(id => id !== null);
      
      const updatePayload = {
        categories: tagIds
      };
      
      const updatedCircle = await updateCircle(circle.id, updatePayload);
      
      // Update local state immediately for better UX
      setLocalCircle({
        ...circle,
        tags: updatedData.tags
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

  // Since all circles are shared, only creators can manage members
  const canManageMembers = isCreator;

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
                {members.length} members
              </Typography>
              {/* Display tags */}
              {localCircle.tags && localCircle.tags.length > 0 && (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {localCircle.tags.map((tag, index) => (
                    <Chip
                      key={index}
                      icon={<LabelIcon />}
                      label={tag}
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ 
                        borderRadius: '16px',
                        backgroundColor: 'rgba(25, 118, 210, 0.1)',
                        color: '#1976d2',
                        fontWeight: '600',
                        border: '1px solid #1976d2',
                        boxShadow: '0 1px 2px rgba(25, 118, 210, 0.15)',
                        '& .MuiChip-icon': {
                          color: '#1976d2',
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
                  (isCreator || member.username === currentUser?.username) && (
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
                onClick={() => setIsAddUsersModalOpen(true)}
              >
                Add User to Circle
              </Button>
            </Box>
          )}

          <AddUsersModal
            open={isAddUsersModalOpen}
            onClose={() => setIsAddUsersModalOpen(false)}
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