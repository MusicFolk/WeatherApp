# Weather App with Favorites

Full-stack web app with Node.js, Express, SQLite, JWT auth, and Tailwind frontend.

## Features

- User registration and login with hashed passwords (bcrypt)
- JWT-based authentication for protected routes
- Weather lookup from backend using WeatherAPI via axios
- Favorite cities per user (add/list/delete)
- Responsive UI pages for auth, search, and favorites

## Tech Stack

- Backend: Node.js, Express, SQLite, jsonwebtoken, bcrypt, axios
- Frontend: HTML, JavaScript, Tailwind CSS

## Project Structure

- backend/
  - server.js
  - db.js
  - routes/
    - auth.js
    - weather.js
    - favorites.js
  - middleware/
    - auth.js
- frontend/
  - login.html
  - index.html
  - favorites.html
  - app.js

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
cp .env.example .env
```

3. Edit `.env` and set:

- `JWT_SECRET`
- `WEATHER_API_KEY` (from WeatherAPI)
- Optional `PORT`

4. Run the server:

```bash
npm start
```

5. Open:

- `http://localhost:3000`

## API Endpoints

### Public

- `POST /api/register`
  - Body: `{ "email": "user@example.com", "password": "secret123" }`

- `POST /api/login`
  - Body: `{ "email": "user@example.com", "password": "secret123" }`
  - Returns: `{ "token": "..." }`

- `GET /api/weather?city=Vilnius&country=Lithuania`
  - Query parameters:
    - `city` (required)
    - `country` (optional)

### Protected (Bearer token required)

- `POST /api/favorites`
  - Headers: `Authorization: Bearer <token>`
  - Body: `{ "city": "Vilnius" }`

- `GET /api/favorites`
  - Headers: `Authorization: Bearer <token>`

- `DELETE /api/favorites/:id`
  - Headers: `Authorization: Bearer <token>`
  - Path parameter: `id`

## Parameter Types Covered

- Query: `/api/weather?city=...&country=...`
- Path: `/api/favorites/:id`
- Headers: `Authorization: Bearer <token>`
- Body: JSON payload in POST routes

## Error Handling

- Validation for required and malformed inputs
- Invalid token and unauthorized access handling
- Invalid city and external API errors handling
- Generic fallback server error responses
