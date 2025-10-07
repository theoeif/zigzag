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

Prerequsites: 

Duplicate `FRONTEND/zigzag/src/config.example.js` rename it with `FRONTEND/zigzag/src/config.js` (to have it ignored by `git`) and replace the following fields with your proper API key :

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

# Handle postgres database
---

## PostgreSQL Setup for Zigzag

The following walks you through configuring PostgreSQL locally for your project, fixing common connection issues, and testing your setup.
The project use sqlite3 with a dump db.sqlite3 by default in local.

---

### 1. Set Environment Variables

Before starting, export the database connection variables:

```bash
export POSTGRES_DB=zigzag
export POSTGRES_USER=zigzag
export POSTGRES_PASSWORD=your_password
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
```

You can also add these lines to your `.env` file for convenience.

---

### ⚠️ Problem: “User password required” or “FATAL: password authentication failed”

If you don’t know your PostgreSQL password or can’t connect, follow these steps to connect and verify your setup.

---

### 2. Check PostgreSQL Installation

Run the following commands to confirm PostgreSQL is installed:

```bash
command -v psql
psql --version
```

Example output:

```
/usr/local/bin/psql
psql (PostgreSQL) 14.15 (Homebrew)
```

If PostgreSQL isn’t running, start the service (for Homebrew installations):

```bash
brew services start postgresql@14
```

---

### 3. Connect with the Default `postgres` User

Try connecting using the default superuser:

```bash
psql -U postgres
```

> 💡 The password is usually your macOS user password (if installed via Homebrew).

---

### 4. Create the Target Database and Role

Once inside `psql`, run:

```sql
CREATE ROLE zigzag WITH LOGIN PASSWORD 'your_strong_password';
CREATE DATABASE zigzag OWNER zigzag;
GRANT ALL PRIVILEGES ON DATABASE zigzag TO zigzag; // might be optionnal
```
To verify:

```sql
\du zigzag      -- check the role exists
\l              -- list databases
\conninfo       -- confirm connection info
```

---

### 5. Test the Connection

Outside `psql`, run:

```bash
psql "host=${POSTGRES_HOST:-localhost} port=${POSTGRES_PORT:-5432} dbname=${POSTGRES_DB:-zigzag} user=${POSTGRES_USER:-zigzag} password=${POSTGRES_PASSWORD}"
```

Inside `psql`:

```sql
\l       -- list databases
\dt      -- list tables
\q       -- quit
```

---

### 6. PostgreSQL Configuration Notes

If you get remote connection errors or authentication issues, check your PostgreSQL host-based authentication file:

```bash
cd /usr/local/var/postgresql@14
vi pg_hba.conf
```

Then restart PostgreSQL:

```bash
brew services restart postgresql@14
```

---

### 7. Load and Dump Data (Django Example)

To **export data** from SQLite:

```bash
python manage.py dumpdata \
  --database=sqlite \
  --natural-foreign --natural-primary \
  --exclude=contenttypes --exclude=auth.Permission \
  --indent 2 > dump.json
```

To **import data** into PostgreSQL:

```bash
python manage.py loaddata dump.json
```

---

## ⚡ 8. Run Django with PostgreSQL

Switch your default database in your Django terminal session:

```bash
export DB_DEFAULT="postgres"
```

Then run migrations and start your app:

```bash
python manage.py migrate
python manage.py runserver
```

---

### 💡 Quick Recap

* Create PostgreSQL user + DB: `CREATE ROLE`, `CREATE DATABASE`
* Grant privileges if needed
* Test connection with `psql`
* Update Django to use PostgreSQL
* Load your data and run migrations

---


# Known issues
Clicking on Profile of people doesn't work

[Issue Link Creation](https://github.com/theoeif/zigzag/issues/new?body=%23%23%20Actual%20Behavior%0D%0D%0D%23%23%20Expected%20Behavior%0D%0D%0D%23%23%20Steps%20to%20Reproduce%0D%0D%0D%23%23%20Screenshot&labels=bug)

# Long term

- View Profile of others.
- Add a calendar views
- Make invitation links for people (1 solution : Create "invited Circle")
-  \>300 : 
    - Add Friends relationships :
         - see friends of friends events when Number > 300 : marker and project.
         - Found list of friends insatead of user on the plateform.
    - People could add their circle into a project.
    - Introduce some public event when Number > 1000
    - Make invitation links for people (1 solution : Create "invited Circle")
- Implementing a dapp for financing project through the blockchain.


# Credits and references
Related projects : La carte des collocs, Leaflet


[Doc github markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

[Build doc landing page] (https://github.com/cruip/open-react-template/) or (https://github.com/GrapesJS/grapesjs)





---
