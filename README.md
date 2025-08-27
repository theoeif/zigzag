# zigzag
---

# 🔧 Project Setup

## 🧱 Prerequisites

* Python 3.x
* Node.js (Install: [https://nodejs.org/en/download](https://nodejs.org/en/download))
* OS: Windows/macOS

---

## ⚙️ Backend (Django)

### 🐍 Setup

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

**macOS:**

```bash
python3 -m venv venv
source venv/bin/activate
```

Install deps:

```bash
pip install -r requirements.txt
```

DB setup:

```bash
python manage.py makemigrations
python manage.py migrate
```

Run server:

```bash
cd BACKEND/myprojects
python manage.py runserver
```

Quick run (macOS):

```bash
source venv/bin/activate && cd myproject && python3 manage.py runserver
```

---

## 🌐 Frontend

Setup:

```bash
cd FRONTEND
npm install --legacy-peer-deps
```

Run:

```bash
npm run dev
```

---

Let me know if you want a version with Docker, `.env` config, or deployment steps.
