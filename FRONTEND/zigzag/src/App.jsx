import React from "react";
import { BrowserRouter as Router, useLocation, Route, Routes } from "react-router-dom";
import MarkersMap from "./components/MarkersMap";
import AccountCreation from "./components/Login/AccountCreation";
import Login from "./components/Login/Login.jsx";
import Profile from "./components/Profile/Profile";
import ProfilePage from "./components/Profile/ProfilePage";
import Project from "./components/Project/Project";
import DirectEventLinkView from './components/EventViewMap/DirectEventLinkView.jsx';
import MainCircles from "./components/Circles/MainCircles";
import Callback from './contexts/Callback';

const App = () => {

  // Get the current location so we can check if a modal should be shown
  const location = useLocation();
  // If a modal was opened from a background location, it will be stored here.
  const state = location.state || {};

  return (
    <>
      <Routes location={state.background || location}>
        <Route path="/" element={<MarkersMap />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/create-account" element={<AccountCreation />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/profile/:username" element={<ProfilePage />} />
        <Route path="/events" element={<Project />} />
        <Route path="/circles" element={<MainCircles />} />
        <Route path="/event/:id" element={<DirectEventLinkView />} />
      </Routes>

    </>
  );
};

export default App;
