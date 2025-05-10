# LLM Compare Frontend

A modern web application for comparing responses from different Large Language Models (LLMs) including GPT-4, Claude, and XAI.

## Features

- Compare responses from multiple LLMs side by side
- Real-time streaming responses
- Performance metrics tracking
- Historical comparison view
- Cost and latency analysis
- Markdown support for responses

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- A modern web browser

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd llm-compare/frontend
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create environment files:
```bash
# Development
cp .env.example .env

# Production
cp .env.example .env.production
```

4. Configure environment variables:
```env
# .env
API_URL=http://localhost:8000/api/v1

# .env.production
API_URL=https://your-production-api-url/api/v1
```

## Development

Start the development server:
```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

## Building for Production

1. Build the application:
```bash
npm run build
# or
yarn build
```

2. Preview the production build locally:
```bash
npm run preview
# or
yarn preview
```

The production preview will be available at `http://localhost:4173`

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts
├── pages/         # Page components
├── services/      # API services
├── App.tsx        # Main application component
├── main.tsx       # Application entry point
└── config.ts      # Configuration settings
```

## Technologies Used

- React
- TypeScript
- Vite
- Tailwind CSS
- React Query
- React Router
- React Markdown

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| API_URL | API endpoint URL | http://localhost:8000/api/v1 |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
