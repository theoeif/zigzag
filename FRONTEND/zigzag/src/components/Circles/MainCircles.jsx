import React, { useState, useEffect, useRef } from 'react';
import { useTheme, useMediaQuery } from '@mui/material';
import Drawer from '@mui/material/Drawer';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import PeopleIcon from '@mui/icons-material/People';
import Header from '../Header/Header';
import LeftMenu from '../LeftMenu/LeftMenu';
import CirclesSidebar from './CirclesSidebar';
import CircleDetailsView from './CircleDetailsView';
import UserProfileView from './UserProfileView';

const MainCircles = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [isLeftMenuOpen, setIsLeftMenuOpen] = useState(false);
  const [isCirclesSidebarOpen, setIsCirclesSidebarOpen] = useState(false);
  const [selectedCircle, setSelectedCircle] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const menuRef = useRef(null);
  const circlesSidebarRef = useRef(null);
  const contentRef = useRef(null);

  // Handle outside clicks to close menus
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close left menu if open and clicked outside
      if (isLeftMenuOpen &&
          menuRef.current &&
          !menuRef.current.contains(event.target) &&
          !event.target.closest('.header-menu-button')) { // Ignore clicks on the menu toggle button
        setIsLeftMenuOpen(false);
      }

      // Close circles sidebar if mobile, open, and clicked outside
      if (isMobile &&
          isCirclesSidebarOpen &&
          circlesSidebarRef.current &&
          !circlesSidebarRef.current.contains(event.target) &&
          !event.target.closest('[data-circles-toggle]')) { // Ignore clicks on the sidebar toggle button
        setIsCirclesSidebarOpen(false);
      }
    };

    // Add click and touch event listeners
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      // Clean up event listeners
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isLeftMenuOpen, isCirclesSidebarOpen, isMobile]);

  const handleSelectCircle = (circle) => {
    setSelectedCircle(circle);
    setSelectedUser(null);
    if (isMobile) setIsCirclesSidebarOpen(false);
  };

  const handleCircleDeleted = () => {
    setSelectedCircle(null);
    // Force CirclesSidebar to refresh its list
    const event = new CustomEvent('refreshCircles');
    window.dispatchEvent(event);
  };

  const handleBackToCircles = () => {
    setSelectedUser(null);
    if (isMobile) setIsCirclesSidebarOpen(true);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <Header
        toggleLeftMenu={() => setIsLeftMenuOpen(!isLeftMenuOpen)}
        showBackButton={false}
      />

      {isLeftMenuOpen && (
        <div ref={menuRef} className="left-menu">
          <LeftMenu closeMenu={() => setIsLeftMenuOpen(false)} />
        </div>
      )}

      <Box sx={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>
        <Drawer
          variant={isMobile ? 'temporary' : 'permanent'}
          open={isMobile ? isCirclesSidebarOpen : true}
          onClose={() => setIsCirclesSidebarOpen(false)}
          sx={{
            width: 240,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
              width: 240,
              boxSizing: 'border-box',
              mt: 'calc(64px + env(safe-area-inset-top))' // Account for header height + safe area
            },
          }}
          // Add a ref to the drawer content for click outside detection
          PaperProps={{ ref: circlesSidebarRef }}
        >
          <CirclesSidebar
            onSelectCircle={handleSelectCircle}
            selectedCircleId={selectedCircle?.id}
          />
        </Drawer>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            mt: 'calc(64px + env(safe-area-inset-top))', // Account for header height + safe area
            overflow: 'auto'
          }}
          ref={contentRef}
        >
          {isMobile && (
            <Button
              variant="outlined"
              startIcon={<PeopleIcon />}
              onClick={() => setIsCirclesSidebarOpen(true)}
              sx={{ mb: 2 }}
              data-circles-toggle="true"
            >
              Cercles
            </Button>
          )}

          {selectedUser ? (
            <UserProfileView userId={selectedUser} />
          ) : (
            <CircleDetailsView
              circle={selectedCircle}
              onSelectUser={setSelectedUser}
              onCircleDeleted={handleCircleDeleted}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default MainCircles;
