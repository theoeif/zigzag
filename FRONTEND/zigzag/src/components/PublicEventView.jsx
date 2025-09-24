import React from "react";
import { useParams } from "react-router-dom";
import EventView from "./EventView";

const PublicEventView = () => {
  const { id } = useParams();
  
  return (
    <EventView
      eventId={id}
      displayMode="fullpage"
    />
  );
};

export default PublicEventView; 