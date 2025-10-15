# zigzag
---

## zigzag Project
The Zig Zag project is a web application that lets users explore markers on an interactive map.
- The backend is built with Django 4.2, while the frontend uses the React framework Vite.
- The base maps are vector tiles served by MapTiler. To render those tiles in Leaflet, we use MapLibre GL Leaflet (@maplibre/maplibre-gl-leaflet), a binding that connects MapLibre GL JS to the familiar Leaflet API. This binding was originally developed for Mapbox (mapbox-gl-leaflet) and later migrated to MapLibre after Mapbox changed its license. Finally, leaflet.markercluster is used to group markers efficiently and keep the map readable at different zoom levels.

Package used : https://www.npmjs.com/package/@maplibre/maplibre-gl-leaflet.

- The project is almost live and close to production readines : [App Link](https://duckduckgo.com)


## 🔧 Project Setup

### Prerequisites

* ***Python >=3.9, <3.11***
* Node.js (Install: [https://nodejs.org/en/download](https://nodejs.org/en/download))
* OS: Windows/macOS

---

### Backend (Django)

1. Copy environment template and configure:

```bash
cd BACKEND/zigzag
cp env.example .env
```

2. Edit `.env` and fill in your actual values (especially SECRET_KEY and database password):

```bash
SECRET_KEY=your-django-secret-key-here
DEBUG=True
ALLOWED_HOSTS=192.168.1.13,127.0.0.1
POSTGRES_PASSWORD=your-database-password-here
# ... other variables
```

3. Install dependencies:

```bash
cd BACKEND
uv sync
```

### Run server:

```bash
cd zigzag
uv run manage.py runserver
```

You can then open the admin dashboard at <http://127.0.0.1:8000/admin/> and type-in your password.

---

## Frontend

Prerequisites:

1. Copy environment template and fill in your API keys:

```bash
cd FRONTEND/zigzag
cp env.example .env
```

2. Edit `.env` and replace the placeholder values with your actual API keys:

```bash
VITE_API_BASE_URL=http://127.0.0.1:8000/api/
VITE_OPEN_CAGE_API_KEY=your-opencage-key-here
VITE_OPENCAGE_SEARCH_TOKEN=your-opencage-search-token-here
VITE_MAPTILER_API_KEY=your-maptiler-key-here
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

## Handle postgres database

To setup a postgres database, please visit the wiki : [Set Up a Postgres Database](https://github.com/theoeif/zigzag/wiki/SetUp-a-PostgreSQL-DB)


## Known issues

Clicking on Profile of people doesn't work

[Issue Link Creation](https://github.com/theoeif/zigzag/issues/new?body=%23%23%20Actual%20Behavior%0D%0D%0D%23%23%20Expected%20Behavior%0D%0D%0D%23%23%20Steps%20to%20Reproduce%0D%0D%0D%23%23%20Screenshot&labels=bug)

## Long term

- Add a calendar view
-  \>300 :
    - Add Friends relationships :
         - see friends of friends events when Number > 300 : marker and project.
         - Found list of friends insatead of user on the plateform.
    - People could add their circle into a project.
    - Introduce some public event when Number > 1000
    - Make invitation links for people (1 solution : Create "invited Circle")
- Implementing a dapp for financing project through the blockchain. (compatible capacitor)


## Credits and references
Related projects : La carte des collocs, Leaflet


[Doc github markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

[Build doc landing page](https://github.com/cruip/open-react-template/) or [here](https://github.com/GrapesJS/grapesjs)
