import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, useLocation, Route, Routes, useNavigate } from "react-router-dom";
import MarkersMap from "./components/MarkersMap";
import AccountCreation from "./components/Login/AccountCreation";
import Login from "./components/Login/Login.jsx";
import PasswordResetRequest from "./components/Login/PasswordResetRequest";
import PasswordResetConfirm from "./components/Login/PasswordResetConfirm";
import Profile from "./components/Profile/Profile";
import ProfilePage from "./components/Profile/ProfilePage";
import Project from "./components/Project/Project";
import DirectEventLinkView from './components/EventViewMap/DirectEventLinkView.jsx';
import MainCircles from "./components/Circles/MainCircles";
import CalendarView from "./components/Calendar/CalendarView";
import Settings from "./components/Settings/Settings";
import Callback from './contexts/Callback';
import { initDeepLinking, removeDeepLinkListener } from './utils/deepLinkHandler';
import Help from "./components/Help/Help";
import Privacy from "./components/Help/Privacy";
import Header from "./components/Header/Header";
// Removed per-page header/menu handling from App; handled inside Help/Privacy

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // If a modal was opened from a background location, it will be stored here.
  const state = location.state || {};

  // Initialize deep linking when app starts
  useEffect(() => {
    console.log('App: Initializing deep linking');
    initDeepLinking(navigate);

    // Cleanup on unmount
    return () => {
      console.log('App: Cleaning up deep link listeners');
      removeDeepLinkListener();
    };
  }, []); // run only once on mount.

  return (
    <>
      <Routes location={state.background || location}>
        <Route path="/" element={<MarkersMap />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/create-account" element={<AccountCreation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/password-reset" element={<PasswordResetRequest />} />
        <Route path="/password-reset-confirm/:uid/:token" element={<PasswordResetConfirm />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/events" element={<Project />} />
        <Route path="/circles" element={<MainCircles />} />
        <Route path="/calendar" element={<CalendarView />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/event/:id" element={<DirectEventLinkView />} />
        <Route path="/help" element={<Help />} />
        <Route path="/privacy" element={<Privacy />} />
      </Routes>

      {/* Modal routes - rendered when background state exists */}
      {state.background && (
        <Routes>
          <Route path="/event/:id" element={<DirectEventLinkView />} />
        </Routes>
      )}

    </>
  );
};

export default App;
