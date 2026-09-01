# Manisa

Manisa is a business-management web application for managing customers,
appointments, services, payments, income, working hours, and business reporting.

This repository is currently an initial application scaffold. It uses a modular
monolith architecture with separate frontend and API applications in one repository.

## Technology

- Frontend: Next.js, TypeScript, App Router, ESLint, and Tailwind CSS
- Backend: Python, FastAPI, and Uvicorn

## Repository structure

```text
.
├── apps
│   ├── api        # FastAPI application
│   └── web        # Next.js application
├── docs           # Project documentation
└── .github
    └── workflows  # Reserved for future workflows
```

## Run the frontend

Node.js 20.9 or newer is required.

```bash
cd apps/web
npm install
npm run dev
```

Open `http://localhost:3000`.

## Run the backend

```bash
cd apps/api
python -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/health` to verify the API.
