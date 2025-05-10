# **2-Day Trial Work Task: AI Model Playground with 3-Model Comparison**

## **Project Overview**

You are tasked with building an "AI Model Playground" - a web application that allows users to compare responses from three different AI models side-by-side in a parallel view. This tool will help users evaluate which AI models perform best for specific use cases by directly comparing their outputs, response times, token usage, and estimated costs.

## **Technical Requirements**

**Backend Development (Day 1)**

**1. AI Provider Integration**

- Integrate with exactly three AI models from at least two providers:
    - OpenAI (GPT-4o)
    - Anthropic (Claude 3 Opus or Sonnet)
    - XAi
- Create a unified API interface that abstracts provider-specific implementations
- Implement proper error handling for API failures and rate limits

**2. Parallel Request Processing**

- Design a system to send the same prompt to all three models simultaneously
- Implement asynchronous processing to handle concurrent API calls
- Ensure responses are properly matched to their respective models

**3. Token Counting and Usage Tracking**

- Implement token counting for each model type
- Track prompt tokens, completion tokens, and total tokens per model
- Calculate estimated costs based on current pricing for each model

**4. Data Persistence**

- Create a database schema for storing:
    - User prompts
    - Model responses from all three models
    - Performance metrics for comparison
- Implement APIs for saving and retrieving comparison history

**Frontend Development (Day 2)**

**1. Three-Panel Interface**

- Create a clean, responsive interface with:
    - Single prompt input area at the top
    - Three equal-width columns displaying responses side-by-side
    - Each column clearly labeled with model name and provider
    - Performance metrics displayed under each response
- Implement a modern design using a component library of your choice

**2. State Management**

- Implement state management for:
    - Three concurrent API responses
    - Individual loading states for each model
    - Synchronized scrolling option for comparing long responses
    - Error handling for each model independently

**3. History and Sharing**

- Implement a history feature to save interesting comparisons

## **Technical Stack**

You may choose your preferred technologies, but we recommend:

**Backend**

- fastapi
- Database of your choice (PostgreSQL, MongoDB, etc.)
- Authentication (optional - can use a simple approach)

**Frontend**

- React with TypeScript
- State management (React Context, Redux, Zustand, etc.)
- CSS framework (Tailwind, Chakra UI, etc.)

## **Deliverables**

By the end of the 2-day period, you should provide:

1. A working application deployed to a platform of your choice (Vercel, Netlify, etc.)
2. Source code in a Git repository with clear documentation
3. A README explaining:
    - Project structure and architecture
    - Setup instructions
    - Technical decisions and tradeoffs
    - Future improvements