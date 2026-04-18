# Zomaal Backend

Backend API server for Zomaal.

## Project Structure

```
Zomaal-Backend/
├── src/
│   ├── config/       # Configuration and environment variables
│   ├── controllers/  # Request handlers (business logic)
│   ├── middleware/   # Express middleware (error handling, auth, etc.)
│   ├── models/       # Database models and schemas
│   ├── routes/       # API route definitions
│   ├── services/     # Business logic services
│   ├── utils/        # Helper functions and utilities
│   └── validators/   # Input validation schemas
├── index.js          # Application entry point
├── .env              # Environment variables (do not commit)
├── .env.example      # Example environment variables
└── package.json
```

## Getting Started

### Prerequisites

- Node.js >= 18.x
- npm >= 9.x

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

4. Start development server:
   ```bash
   npm run dev
   ```

5. Start production server:
   ```bash
   npm start
   ```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/`      | Server info |
| GET    | `/api/health` | Health check |

## Adding New Features

Follow this pattern when adding new features:

1. **Routes** - Define API endpoints in `src/routes/`
2. **Controllers** - Add request handlers in `src/controllers/`
3. **Services** - Put business logic in `src/services/`
4. **Models** - Define data models in `src/models/`
5. **Validators** - Add input validation in `src/validators/`

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| CORS_ORIGIN | Allowed CORS origins | * |
