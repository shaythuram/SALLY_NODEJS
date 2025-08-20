# Sales Coaching API

A Node.js API server that provides real-time sales coaching insights using OpenAI's GPT models. The API includes three main endpoints for quick answer generation, DISCO framework analysis, and ephemeral key generation for real-time conversations.

## Features

- **Quick Answer Generation**: Real-time sales coaching insights every 2-3 seconds
- **DISCO Analysis**: Structured extraction of sales conversation data using the DISCO framework
- **Ephemeral Key Generation**: Secure keys for OpenAI Realtime API integration
- **Input Validation**: Comprehensive request validation using express-validator
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Error Handling**: Robust error handling with proper HTTP status codes
- **Security**: Helmet.js for security headers and CORS support

## API Endpoints

### 1. Quick Answer Generation
- **POST** `/api/generate-quick-answer`
- Generates real-time sales coaching insights
- Frequency: Every 2-3 seconds during conversations

### 2. DISCO Analysis
- **POST** `/api/api/analyze-disco`
- Extracts structured DISCO framework data
- Frequency: Every 3-5 seconds during conversations

### 3. Post-Call Steps Analysis
- **POST** `/api/post-call-steps`
- Generates structured post-call action items and next steps
- Frequency: After each call or conversation update

### 4. Ephemeral Key Generation
- **POST** `/api/realtime/ephemeral-key`
- Generates secure keys for OpenAI Realtime API
- Frequency: Session startup only

## Prerequisites

- Node.js 18.0.0 or higher
- OpenAI API key

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd node_backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp env.example .env
```

4. Edit `.env` file and add your OpenAI API key:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=development
```

## Usage

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Documentation

### Quick Answer Generation

**Endpoint:** `POST /api/generate-quick-answer`

**Request Body:**
```json
{
  "ai_chat": "boolean (required, true or false)",
  "user_query": "string (required when ai_chat is true, max 5000 chars)",
  "conversation": "string (required when ai_chat is false, max 10000 chars)"
}
```

**Response for AI Chat (ai_chat: true):**
```json
{
  "response": "string (helpful sales advice and guidance)"
}
```

**Response for Quick Analysis (ai_chat: false):**
```json
{
  "analysis": "string (actionable sales conversation analysis)"
}
```

**Usage Modes:**
- **AI Chat Mode** (`ai_chat: true`) - Takes user query and provides sales coaching advice
- **Quick Analysis Mode** (`ai_chat: false`) - Analyzes full conversation and provides insights

### DISCO Analysis

**Endpoint:** `POST /api/api/analyze-disco`

**Request Body:**
```json
{
  "conversation": "string (required)",
  "template_id": "integer (optional)",
  "context": {
    "type": "string",
    "currentDISCO": {
      "Decision_Criteria": "string",
      "Impact": "string", 
      "Situation": "string",
      "Challenges": "string",
      "Objectives": "string"
    }
  }
}
```

**Response:**
```json
{
  "Decision_Criteria": "• Point 1\n• Point 2\n• Point 3",
  "Impact": "• Point 1\n• Point 2\n• Point 3", 
  "Situation": "• Point 1\n• Point 2\n• Point 3",
  "Challenges": "• Point 1\n• Point 2\n• Point 3",
  "Objectives": "• Point 1\n• Point 2\n• Point 3"
}
```

### Post-Call Steps Analysis

**Endpoint:** `POST /api/post-call-steps`

**Request Body:**
```json
{
  "conversation": "string (required, max 10000 chars)"
}
```

**Response:**
```json
{
  "followUpActions": "- Action 1\n- Action 2\n- Action 3",
  "informationGathering": "- Research 1\n- Research 2\n- Research 3",
  "stakeholderEngagement": "- Stakeholder 1\n- Stakeholder 2\n- Stakeholder 3",
  "proposalPreparation": "- Prep item 1\n- Prep item 2\n- Prep item 3",
  "internalCoordination": "- Internal task 1\n- Internal task 2\n- Internal task 3",
  "timelineManagement": "- Deadline 1\n- Deadline 2\n- Deadline 3"
}
```

### Ephemeral Key Generation

**Endpoint:** `POST /api/realtime/ephemeral-key`

**Request Body:**
```json
{
  "voice": "string (optional, default: 'alloy')"
}
```

**Response:**
```json
{
  "status": "success",
  "ephemeralKey": "string (OpenAI ephemeral key)",
  "expiresAt": "string (ISO timestamp)",
  "sessionId": "string (OpenAI session ID)",
  "model": "string (OpenAI model name)"
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

- **422**: Validation errors
- **500**: Server errors
- **404**: Resource not found

Example error response:
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "conversation": ["The conversation field is required."]
  }
}
```

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Configurable**: Via environment variables

## Health Check

**Endpoint:** `GET /health`

Returns server status and environment information.

## Testing

Run tests:
```bash
npm test
```

## Project Structure

```
src/
├── server.js              # Main server file
├── routes/                # API routes
│   ├── quick-answer.js    # Quick answer generation
│   ├── disco.js          # DISCO analysis
│   └── ephemeral-key.js  # Ephemeral key generation
├── services/             # Business logic
│   └── openai-service.js # OpenAI integration
└── middleware/           # Middleware
    └── validation.js     # Request validation
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key | Required |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | 60000 |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | 100 |

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License 