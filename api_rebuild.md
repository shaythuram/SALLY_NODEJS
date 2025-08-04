# API Rebuild Documentation

This document provides the exact input/output data and prompts for rebuilding the three core API endpoints.

## Endpoint 1: Quick Answer Generation

### API Details
- **Endpoint:** `POST /api/generate-quick-answer`
- **Purpose:** Generate real-time sales coaching insights
- **Frequency:** Every 2-3 seconds during conversations

### Input Data
```json
{
  "conversation": "string (required, max 10000 chars)",
  "template": "string (optional, default: 'General')",
  "context": "string (optional, default: 'general')"
}
```

### Output Data
```json
{
  "quick_answer": "string (actionable response under 120 words)"
}
```

### Context Types
- `general` - Default guidance
- `early_discovery` - Customer situation and pain points
- `mid_discovery` - Requirements and budget constraints
- `late_discovery` - Solution presentation and next steps
- `ai_chat` - Conversational responses
- `live_conversation` - Real-time analysis

### Complete Prompt Template
```
You are an expert sales coach providing real-time guidance during live sales conversations. Analyze the conversation and provide actionable insights.

FULL CONVERSATION HISTORY:
{conversation}

TEMPLATE: {template}
CONTEXT: {context}

{context_instructions}

Please provide a quick answer in JSON format:

{
  "quick_answer": "Your actionable response here. Focus on answering questions, identifying opportunities, or providing key talking points."
}

Guidelines:
- Answer any questions stated in the conversation
- Identify opportunities for the salesperson to explore
- Provide key talking points and next steps
- Suggest responses to customer concerns or objections
- Highlight important points that need attention
- Keep responses under 120 words and make them actionable
- Be specific about what the salesperson should say or ask next
- Focus on insights that will move the conversation forward
```

### Context-Specific Instructions
```javascript
const contextInstructions = {
  early_discovery: `EARLY DISCOVERY FOCUS:
- Focus on understanding the customer's current situation and pain points
- Ask probing questions to uncover deeper issues
- Help the customer articulate their problems clearly
- Build rapport and establish trust
- Identify basic requirements and constraints`,
  
  mid_discovery: `MID DISCOVERY FOCUS:
- Dive deeper into specific pain points and requirements
- Discuss budget constraints and decision criteria
- Explore technical requirements and feature needs
- Address objections and concerns
- Position your solution's value proposition`,
  
  late_discovery: `LATE DISCOVERY FOCUS:
- Focus on solution presentation and next steps
- Address implementation timeline and process
- Discuss decision-making timeline and stakeholders
- Provide specific next actions and commitments
- Help close the deal with clear next steps`,
  
  ai_chat: `AI CHAT FOCUS:
- Provide helpful, informative responses to user questions
- Be conversational and friendly
- Offer practical advice and insights
- Keep responses concise but comprehensive
- Focus on sales and customer support related topics when relevant`,
  
  live_conversation: `LIVE CONVERSATION FOCUS:
- Answer any questions stated in the conversation
- Identify opportunities for the salesperson to explore
- Provide key talking points and next steps
- Suggest responses to customer concerns or objections
- Highlight important points that need attention
- Focus on actionable insights that move the conversation forward`,
  
  general: `GENERAL FOCUS:
- Address the most immediate concern or question
- Provide helpful guidance based on the conversation context
- Focus on building value and moving the conversation forward`
};
```

---

## Endpoint 2: DISCO Analysis

### API Details
- **Endpoint:** `POST /api/api/analyze-disco`
- **Purpose:** Extract structured DISCO framework data
- **Frequency:** Every 3-5 seconds during conversations

### Input Data
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

### Output Data
```json
{
  "Decision_Criteria": "• Point 1\n• Point 2\n• Point 3",
  "Impact": "• Point 1\n• Point 2\n• Point 3", 
  "Situation": "• Point 1\n• Point 2\n• Point 3",
  "Challenges": "• Point 1\n• Point 2\n• Point 3",
  "Objectives": "• Point 1\n• Point 2\n• Point 3"
}
```

### Complete Prompt Template
```
You are a sales assistant trained in B2B SaaS sales using the DISCO framework. Given a transcript or summary of a discovery call, extract all relevant information and map it clearly to the following five categories:

CONVERSATION:
{conversation}

TEMPLATE: {template}

CURRENT DISCO DATA:
- Decision Criteria: {current_disco.Decision_Criteria}
- Impact: {current_disco.Impact}
- Situation: {current_disco.Situation}
- Challenges: {current_disco.Challenges}
- Objectives: {current_disco.Objectives}

Please provide a structured analysis in JSON format with the following structure:

{
  "Decision_Criteria": "• Point 1\\n• Point 2\\n• Point 3",
  "Impact": "• Point 1\\n• Point 2\\n• Point 3",
  "Situation": "• Point 1\\n• Point 2\\n• Point 3",
  "Challenges": "• Point 1\\n• Point 2\\n• Point 3",
  "Objectives": "• Point 1\\n• Point 2\\n• Point 3"
}

Guidelines:
- If a category is not explicitly mentioned, infer it if possible.
- Keep the language concise and business-relevant.
- You may quote or paraphrase the customer's statements if needed.
- Update existing information with new insights from the conversation.
- Only include relevant items that are actually mentioned or implied in the conversation.
```

### Helper Function for DISCO Data Formatting
```javascript
function formatDiscoData(data) {
  if (Array.isArray(data)) {
    return data.join(', ');
  }
  return data || 'None yet';
}
```

---

## Endpoint 3: Ephemeral Key Generation

### API Details
- **Endpoint:** `POST /api/realtime/ephemeral-key`
- **Purpose:** Generate secure keys for OpenAI Realtime API
- **Frequency:** Session startup only

### Input Data
```json
{
  "voice": "string (optional, default: 'alloy')"
}
```

### Output Data
```json
{
  "status": "success",
  "ephemeralKey": "string (OpenAI ephemeral key)",
  "expiresAt": "string (ISO timestamp)",
  "sessionId": "string (OpenAI session ID)",
  "model": "string (OpenAI model name)"
}
```

### Error Response
```json
{
  "status": "error",
  "message": "string (error description)"
}
```

### OpenAI API Call
```javascript
// POST to: https://api.openai.com/v1/realtime/sessions
{
  "model": "gpt-4o-mini-realtime-preview-2024-12-17",
  "voice": "alloy"
}

// Headers:
{
  "Authorization": "Bearer {OPENAI_API_KEY}",
  "Content-Type": "application/json"
}
```

---

## OpenAI API Configuration

### Common Configuration for All Endpoints
```javascript
const openAIConfig = {
  model: 'gpt-4o-mini',
  temperature: 0.3,
  max_tokens: 2000,
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  }
};
```

### System Message
```javascript
const systemMessage = {
  role: 'system',
  content: 'You are an expert sales conversation analyst. Provide only valid JSON responses.'
};
```

---

## Response Parsing

### Quick Answer Response Parser
```javascript
function parseQuickAnswerResponse(response) {
  const jsonMatch = response.match(/\{.*\}/s);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from OpenAI');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error('Failed to parse JSON: ' + error.message);
  }
}
```

### DISCO Response Parser
```javascript
function parseDiscoResponse(response) {
  const jsonMatch = response.match(/\{.*\}/s);
  if (!jsonMatch) {
    throw new Error('Invalid JSON response from OpenAI');
  }

  try {
    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    throw new Error('Failed to parse JSON: ' + error.message);
  }
}
```

---

## Example Usage

### Quick Answer Example
```javascript
// Input
const input = {
  conversation: "salesperson: Hi, how can I help you today?\ncustomer: We're struggling with our current support system. Response times are too slow.",
  template: "Sales Discovery",
  context: "early_discovery"
};

// Expected Output
const output = {
  quick_answer: "Ask about their current support volume and specific pain points. Explore what 'too slow' means - are they losing customers? Get specific metrics on response times and customer satisfaction scores."
};
```

### DISCO Analysis Example
```javascript
// Input
const input = {
  conversation: "customer: We need to reduce response time from 24 hours to under 4 hours.\nsalesperson: What's the impact of slow response times?\ncustomer: We're losing $50,000 per month in customer churn.",
  template_id: 1,
  context: {
    type: "live_conversation",
    currentDISCO: {
      Decision_Criteria: "Response time under 4 hours",
      Impact: "Losing $50,000/month in churn",
      Situation: "Current 24-hour response time",
      Challenges: "Customer churn due to slow support",
      Objectives: "Reduce response time"
    }
  }
};

// Expected Output
const output = {
  Decision_Criteria: "• Response time under 4 hours\n• Cost-effective solution\n• Easy implementation",
  Impact: "• Losing $50,000/month in customer churn\n• Poor customer satisfaction\n• Revenue impact",
  Situation: "• Current 24-hour response time\n• Customer support system issues\n• High customer churn rate",
  Challenges: "• Customer churn due to slow support\n• Revenue loss\n• Customer satisfaction issues",
  Objectives: "• Reduce response time to under 4 hours\n• Improve customer satisfaction\n• Reduce customer churn"
};
```

### Ephemeral Key Example
```javascript
// Input
const input = {
  voice: "alloy"
};

// Expected Output
const output = {
  status: "success",
  ephemeralKey: "sk-...",
  expiresAt: "2024-01-15T10:30:00Z",
  sessionId: "session_abc123",
  model: "gpt-4o-mini-realtime-preview-2024-12-17"
};
```

---

## Error Handling

### Common Error Responses
```javascript
// 422 Validation Error
{
  "message": "The given data was invalid.",
  "errors": {
    "conversation": ["The conversation field is required."]
  }
}

// 500 Server Error
{
  "error": "Quick answer generation failed: OpenAI API call failed"
}

// 404 Not Found
{
  "message": "Resource not found"
}
```

---

## Rate Limiting

- **Quick Answer Generation:** 2-3 second intervals
- **DISCO Analysis:** 3-5 second intervals  
- **Ephemeral Key Generation:** Once per session
- **OpenAI API:** Built-in rate limits apply

---

## Environment Variables

```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3000
NODE_ENV=production
```

This documentation provides everything needed to rebuild these three API endpoints in any language or framework while maintaining full compatibility with the existing frontend.
