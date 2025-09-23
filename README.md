# zigzag
---

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
source .venv/bin/activate && cd myproject && python3 manage.py runserver
```

---

## Frontend

Setup:

```bash
cd FRONTEND/zigzag
npm install --legacy-peer-deps
```

Run:

```bash
npm run dev
```

[App Link](https://duckduckgo.com)

[Doc github markdown](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax)

---
