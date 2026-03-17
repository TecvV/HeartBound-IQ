# ? HeartBound IQ ? Multi Agentic AI Wedding Planner

> Multi-Agent AI system for smarter, cheaper wedding planning.

---

## Project Structure

```
vowiq/
??? backend/
?   ??? agents/
?   ??? models/
?   ??? routes/
?   ??? server.js
?   ??? .env.example
?   ??? package.json
?
??? frontend/
    ??? src/
    ??? public/
    ??? package.json
```

---

## Quick Start

### 1. Backend (Terminal 1)

```bash
cd backend
cp .env.example .env       # Edit with your keys (optional)
npm install
npm start                  # Starts on http://localhost:5009
```

### 2. Frontend (Terminal 2)

```bash
cd frontend
npm install
npm start                  # Opens http://localhost:5010
```

---

## API Keys (optional)

| Key | Where to get | What it unlocks |
|-----|-------------|-----------------|
| `GROQ_API_KEY` | https://console.groq.com | Real AI scoring & copy |
| `GOOGLE_MAPS_API_KEY` | Google Cloud Console ? Places API | Real venue data |
| `MONGODB_URI` | MongoDB Atlas or local | Persist data |
| `MAIL_USER` + `MAIL_PASS` | Gmail App Password | Send invite emails |

---

## Ports

| Service | Port |
|---------|------|
| Backend (Express) | 5009 |
| Frontend (React)  | 5010 |

CORS allows `localhost:5010` and `localhost:3000`.

---

*Built with ? by HeartBound IQ*
