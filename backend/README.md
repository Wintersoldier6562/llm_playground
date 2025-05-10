# AI Model Comparison Backend

This backend service allows you to compare responses from different AI models (OpenAI GPT-4, Anthropic Claude 3, and XAI) for the same prompt. It provides token counting, cost estimation, and performance metrics for each model.

## Features

- Parallel processing of requests to multiple AI models
- Token counting and cost estimation
- Response latency tracking
- Database storage of prompts and responses
- Unified API interface for model comparison

## Setup

### Option 1: Local Development

1. Create a virtual environment and activate it:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create a `.env` file with your API keys:
```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
XAI_API_KEY=your_xai_api_key
```

4. Set up the database:
```bash
# Create a PostgreSQL database named 'ai_playground'
# Update the database connection settings in app/core/config.py if needed
```

5. Run the application:
```bash
uvicorn app.main:app --reload
```

### Option 2: Docker Setup

1. Create a `.env` file with your API keys:
```
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key
XAI_API_KEY=your_xai_api_key
```

2. Build and start the containers:
```bash
docker-compose up --build
```

The application will be available at `http://localhost:8000`

To stop the containers:
```bash
docker-compose down
```

To stop the containers and remove the database volume:
```bash
docker-compose down -v
```

## API Usage

### Compare Models

Send a POST request to `/api/v1/comparison/compare` with the following JSON body:

```json
{
    "prompt": "Your prompt here",
    "models": ["gpt-4", "claude-3-opus", "xai-model"]  // Optional: specify which models to use
}
```

The response will include:
- The prompt ID
- The original prompt
- Responses from each model
- Token usage and cost for each model
- Response latency

## Supported Models

- OpenAI GPT-4
- Anthropic Claude 3 Opus
- XAI Model

## Error Handling

The API includes proper error handling for:
- API failures
- Rate limits
- Invalid requests
- Database errors

## Development

The project structure is organized as follows:

```
app/
├── api/
│   └── v1/
│       ├── endpoints/
│       └── api.py
├── core/
│   ├── ai_providers/
│   │   ├── base.py
│   │   ├── openai_provider.py
│   │   ├── anthropic_provider.py
│   │   └── xai_provider.py
│   ├── database/
│   ├── schemas/
│   └── services/
└── main.py
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 