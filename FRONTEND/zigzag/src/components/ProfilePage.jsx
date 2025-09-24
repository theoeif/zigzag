import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchProfile } from "../api/api";

const ProfilePage = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileData = await fetchProfile(id); // Use the API function
        setProfile(profileData);
      } catch (err) {
        setError(err);
      }
    };

    loadProfile();
  }, [id]);

  if (error) return <div>Error: {error}</div>;
  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1>{profile.username}</h1>
      <p>Email: {profile.email}</p>
      <p>First Name: {profile.first_name}</p>
      <p>Last Name: {profile.last_name}</p>
    </div>
  );
};

export default ProfilePage;
