# Sales Coaching API Usage Guide

This guide provides detailed examples of how to use the Sales Coaching API endpoints.

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment:**
   ```bash
   npm run setup
   ```

3. **Add your OpenAI API key to `.env`:**
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   ```

4. **Start the server:**
   ```bash
   npm run dev
   ```

5. **Test the API:**
   ```bash
   npm run example
   ```

## API Endpoints

### 1. Quick Answer Generation

**Endpoint:** `POST /api/generate-quick-answer`

Generates real-time sales coaching insights every 2-3 seconds during conversations.

#### Request Example:
```bash
curl -X POST http://localhost:3000/api/generate-quick-answer \
  -H "Content-Type: application/json" \
  -d '{
    "conversation": "salesperson: Hi, how can I help you today?\ncustomer: We are struggling with our current support system. Response times are too slow.",
    "template": "Sales Discovery",
    "context": "early_discovery"
  }'
```

#### Response Example:
```json
{
  "quick_answer": "Ask about their current support volume and specific pain points. Explore what 'too slow' means - are they losing customers? Get specific metrics on response times and customer satisfaction scores."
}
```

#### Context Types:
- `general` - Default guidance
- `early_discovery` - Customer situation and pain points
- `mid_discovery` - Requirements and budget constraints
- `late_discovery` - Solution presentation and next steps
- `ai_chat` - Conversational responses
- `live_conversation` - Real-time analysis

### 2. DISCO Analysis

**Endpoint:** `POST /api/api/analyze-disco`

Extracts structured DISCO framework data every 3-5 seconds during conversations.

#### Request Example:
```bash
curl -X POST http://localhost:3000/api/api/analyze-disco \
  -H "Content-Type: application/json" \
  -d '{
    "conversation": "customer: We need to reduce response time from 24 hours to under 4 hours.\nsalesperson: What is the impact of slow response times?\ncustomer: We are losing $50,000 per month in customer churn.",
    "template_id": 1,
    "context": {
      "type": "live_conversation",
      "currentDISCO": {
        "Decision_Criteria": "Response time under 4 hours",
        "Impact": "Losing $50,000/month in churn",
        "Situation": "Current 24-hour response time",
        "Challenges": "Customer churn due to slow support",
        "Objectives": "Reduce response time"
      }
    }
  }'
```

#### Response Example:
```json
{
  "Decision_Criteria": "• Response time under 4 hours\n• Cost-effective solution\n• Easy implementation",
  "Impact": "• Losing $50,000/month in customer churn\n• Poor customer satisfaction\n• Revenue impact",
  "Situation": "• Current 24-hour response time\n• Customer support system issues\n• High customer churn rate",
  "Challenges": "• Customer churn due to slow support\n• Revenue loss\n• Customer satisfaction issues",
  "Objectives": "• Reduce response time to under 4 hours\n• Improve customer satisfaction\n• Reduce customer churn"
}
```

### 3. Ephemeral Key Generation

**Endpoint:** `POST /api/realtime/ephemeral-key`

Generates secure keys for OpenAI Realtime API (session startup only).

#### Request Example:
```bash
curl -X POST http://localhost:3000/api/realtime/ephemeral-key \
  -H "Content-Type: application/json" \
  -d '{
    "voice": "alloy"
  }'
```

#### Response Example:
```json
{
  "status": "success",
  "ephemeralKey": "sk-...",
  "expiresAt": "2024-01-15T10:30:00Z",
  "sessionId": "session_abc123",
  "model": "gpt-4o-mini-realtime-preview-2024-12-17"
}
```

#### Available Voices:
- `alloy` (default)
- `echo`
- `fable`
- `onyx`
- `nova`
- `shimmer`

## JavaScript/Node.js Examples

### Using Axios

```javascript
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3000';

// Quick Answer Generation
async function generateQuickAnswer() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/generate-quick-answer`, {
      conversation: "salesperson: Hi, how can I help you today?\ncustomer: We're struggling with our current support system.",
      template: "Sales Discovery",
      context: "early_discovery"
    });
    
    console.log('Quick Answer:', response.data.quick_answer);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// DISCO Analysis
async function analyzeDisco() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/api/analyze-disco`, {
      conversation: "customer: We need to reduce response time from 24 hours to under 4 hours.",
      template_id: 1,
      context: {
        type: "live_conversation",
        currentDISCO: {
          Decision_Criteria: "Response time under 4 hours",
          Impact: "Losing $50,000/month in churn"
        }
      }
    });
    
    console.log('DISCO Analysis:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

// Ephemeral Key Generation
async function generateEphemeralKey() {
  try {
    const response = await axios.post(`${API_BASE_URL}/api/realtime/ephemeral-key`, {
      voice: "alloy"
    });
    
    console.log('Ephemeral Key:', response.data);
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}
```

### Using Fetch (Browser)

```javascript
const API_BASE_URL = 'http://localhost:3000';

// Quick Answer Generation
async function generateQuickAnswer() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-quick-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        conversation: "salesperson: Hi, how can I help you today?\ncustomer: We're struggling with our current support system.",
        template: "Sales Discovery",
        context: "early_discovery"
      })
    });
    
    const data = await response.json();
    console.log('Quick Answer:', data.quick_answer);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

## Error Handling

The API returns appropriate HTTP status codes and error messages:

### Validation Errors (422)
```json
{
  "message": "The given data was invalid.",
  "errors": {
    "conversation": ["The conversation field is required."],
    "context": ["The context field must be one of: general, early_discovery, mid_discovery, late_discovery, ai_chat, live_conversation."]
  }
}
```

### Server Errors (500)
```json
{
  "error": "Quick answer generation failed: OpenAI API call failed"
}
```

### Rate Limiting (429)
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

## Rate Limiting

- **Default**: 100 requests per minute per IP
- **Configurable**: Via environment variables
- **Quick Answer**: Recommended every 2-3 seconds
- **DISCO Analysis**: Recommended every 3-5 seconds
- **Ephemeral Key**: Once per session

## Testing

Run the test suite:
```bash
npm test
```

Run the example script:
```bash
npm run example
```

## Health Check

Check server status:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "environment": "development"
}
```

## Production Deployment

1. Set environment variables:
   ```env
   NODE_ENV=production
   PORT=3000
   OPENAI_API_KEY=your_production_api_key
   ```

2. Start the server:
   ```bash
   npm start
   ```

3. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name "sales-coaching-api"
   ```

## Troubleshooting

### Common Issues

1. **OpenAI API Key Missing**
   - Ensure `OPENAI_API_KEY` is set in `.env` file
   - Verify the API key is valid and has sufficient credits

2. **Rate Limiting**
   - Reduce request frequency
   - Increase rate limit in environment variables

3. **Validation Errors**
   - Check request body format
   - Ensure all required fields are provided
   - Verify field types and constraints

4. **Server Not Starting**
   - Check if port 3000 is available
   - Verify all dependencies are installed
   - Check for syntax errors in code

### Debug Mode

Enable debug logging by setting:
```env
NODE_ENV=development
```

This will show detailed console logs for API requests and responses. 