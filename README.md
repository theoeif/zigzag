# zigzag
---
TODO : take that template
https://github.com/cfpb/open-source-project-template/

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
cd FRONTEND/zigzag && cp src/config.example.js src/config.js
#then edit src/config.js and fill your API keys
Optional automation (auto-copy if missing on install). In FRONTEND/zigzag/package.json:
{
  "scripts": {
    "postinstall": "node -e \"const fs=require('fs');const s='src/config.example.js', d='src/config.js'; if(!fs.existsSync(d)) fs.copyFileSync(s,d);\""
  }
}
Then in README: “Run npm install” will create src/config.js if it doesn’t exist.



Setup:

```bash
cd FRONTEND/zigzag
npm install --legacy-peer-deps
```

Run:

```bash
npm run dev
```

[Issue Link Creation](https://github.com/theoeif/zigzag/issues/new?body=%23%23%20Actual%20Behavior%0D%0D%0D%23%23%20Expected%20Behavior%0D%0D%0D%23%23%20Steps%20to%20Reproduce%0D%0D%0D%23%23%20Screenshot&labels=bug)

[App Link](https://duckduckgo.com)

[Doc github markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

[Build doc landing page] (https://github.com/cruip/open-react-template/) or (https://github.com/GrapesJS/grapesjs)





---
