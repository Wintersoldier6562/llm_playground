# AI Model Playground

A web application that allows users to compare responses from three different AI models side-by-side in a parallel view. This tool helps users evaluate which AI models perform best for specific use cases by directly comparing their outputs, response times, token usage, and estimated costs.

## Project Structure

The project is organized as a monorepo with two main directories:

- `backend/`: FastAPI-based backend service
- `frontend/`: React-based frontend application

## Features

- Compare responses from three AI models simultaneously
- Track token usage and estimated costs
- View performance metrics for each model
- Save and share comparison history
- Modern, responsive UI with synchronized scrolling

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

5. Run the development server:
   ```bash
   uvicorn app.main:app --reload
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Technical Stack

### Backend
- FastAPI
- PostgreSQL
- Pydantic
- Python 3.9+

### Frontend
- React with TypeScript
- Tailwind CSS
- React Query
- Redux for state

## API Documentation

Once the backend server is running, visit `http://localhost:8000/docs` for the interactive API documentation.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 