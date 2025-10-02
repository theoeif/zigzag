# zigzag
---

# zigzag Project
The Zig Zag project is a web application that lets users explore markers on an interactive map. 
- The backend is built with Django 4.2, while the frontend uses the React framework Vite.
- The base maps are vector tiles served by MapTiler. To render those tiles in Leaflet, we use MapLibre GL Leaflet (@maplibre/maplibre-gl-leaflet), a binding that connects MapLibre GL JS to the familiar Leaflet API. This binding was originally developed for Mapbox (mapbox-gl-leaflet) and later migrated to MapLibre after Mapbox changed its license. Finally, leaflet.markercluster is used to group markers efficiently and keep the map readable at different zoom levels.
  
Package used : https://www.npmjs.com/package/@maplibre/maplibre-gl-leaflet.

- The project is almost live and close to production readines : [App Link](https://duckduckgo.com)
  

# 🔧 Project Setup

## Prerequisites

* ***Python >=3.9, <3.11*** 
* Node.js (Install: [https://nodejs.org/en/download](https://nodejs.org/en/download))
* OS: Windows/macOS

---

## Backend (Django)

### requirements

```bash
uv init
uv sync
source .venv/bin/activate
```

### DB setup:

```bash
python manage.py makemigrations
python manage.py migrate
```

### Run server:

```bash
source .venv/bin/activate && cd myproject && python3 manage.py runserver --skip-checks
```

---

## Frontend

Prerequsites: 

Replace FRONTEND/zigzag/src/config.example.js by FRONTEND/zigzag/src/config.js with proper Api key : 
```bash
export const OPEN_CAGE_API_KEY = "geocoding api OpenCage" (gratuit);
export const OPENCAGE_SEARCH_TOKEN = "Location autosuggest OpenCage" (payant);
export const MAPTILER_API_KEY = "https://cloud.maptiler.com/ vector style" (gratuit);
```

Setup:

```bash
cd FRONTEND/zigzag
npm install --legacy-peer-deps
```

Run:

```bash
npm run dev
```

# Known issues
Clicking on Profile of people doesn't work

[Issue Link Creation](https://github.com/theoeif/zigzag/issues/new?body=%23%23%20Actual%20Behavior%0D%0D%0D%23%23%20Expected%20Behavior%0D%0D%0D%23%23%20Steps%20to%20Reproduce%0D%0D%0D%23%23%20Screenshot&labels=bug)

# The Plan

## LONG TERM :
- View Profile of others.
- Add a calendar views
- Make invitation links for people (1 solution : Create "invited Circle" and Hidden from Sidebar)
-  >300 : 
    - Add Friends relationships :
         - see friends of friends events when Number > 300 : marker and project.
         - Found list of friends insatead of user on the plateform.
    - People could add their circle into a project.
    - Introduce some public event when Number > 1000 


# Credits and references
Related projects : La carte des collocs, Leaflet


TODO : follow that template
https://github.com/cfpb/open-source-project-template/

[Doc github markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

[Build doc landing page] (https://github.com/cruip/open-react-template/) or (https://github.com/GrapesJS/grapesjs)





---
