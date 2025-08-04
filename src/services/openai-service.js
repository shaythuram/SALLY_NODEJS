const OpenAI = require('openai');

class OpenAIError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OpenAIError';
  }
}

class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.config = {
      model: 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 2000
    };
  }

  async aiChat(userQuery) {
    const prompt = `You are an expert sales coach providing helpful guidance for sales professionals. Answer the user's question with practical, actionable advice.

USER QUERY:
${userQuery}

Please provide a helpful response in JSON format:

{
  "response": "Your helpful and actionable response here. Focus on providing practical sales advice, tips, or guidance."
}

Guidelines:
- Provide clear, actionable advice
- Keep responses under 150 words
- Focus on sales-related topics
- Be conversational and helpful
- Offer practical tips and strategies
- If the question is not sales-related, politely redirect to sales topics`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales coach. Provide only valid JSON responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new OpenAIError('No response content received from OpenAI');
      }

      return this.parseAiChatResponse(content);
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`AI chat failed: ${error.message}`);
    }
  }

  async quickAnalysis(conversation) {
    const prompt = `You are an expert sales coach providing real-time guidance during live sales conversations. Analyze the conversation and provide actionable insights.

FULL CONVERSATION HISTORY:
${conversation}

TEMPLATE: Sales Coaching Analysis

Please provide a quick analysis in JSON format:

{
  "analysis": "Your actionable analysis here. Focus on identifying opportunities, providing key talking points, and suggesting next steps."
}

Guidelines:
- Analyze the conversation for sales opportunities
- Identify key talking points and next steps
- Suggest responses to customer concerns or objections
- Highlight important points that need attention
- Keep responses under 120 words and make them actionable
- Be specific about what the salesperson should say or ask next
- Focus on insights that will move the conversation forward`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales conversation analyst. Provide only valid JSON responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new OpenAIError('No response content received from OpenAI');
      }

      return this.parseQuickAnalysisResponse(content);
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`Quick analysis failed: ${error.message}`);
    }
  }



  async analyzeDisco(conversation,  context = {}) {
    console.log('Analyzing DISCO for conversation:', conversation);
    console.log('Context:', context);
    const currentDisco = context.currentDISCO || {};
    const formattedDisco = this.formatDiscoData(currentDisco);
    
    const prompt = `You are a sales assistant trained in B2B SaaS sales using the DISCO framework. Given a transcript or summary of a discovery call, extract all relevant information and map it clearly to the following five categories:

CONVERSATION:
${conversation}



CURRENT DISCO DATA:
- Decision Criteria: ${formattedDisco.Decision_Criteria}
- Impact: ${formattedDisco.Impact}
- Situation: ${formattedDisco.Situation}
- Challenges: ${formattedDisco.Challenges}
- Objectives: ${formattedDisco.Objectives}

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
- Only include relevant items that are actually mentioned or implied in the conversation.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        messages: [
          {
            role: 'system',
            content: 'You are an expert sales conversation analyst. Provide only valid JSON responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new OpenAIError('No response content received from OpenAI');
      }

      return this.parseDiscoResponse(content);
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`DISCO analysis failed: ${error.message}`);
    }
  }

  async generateEphemeralKey(voice = 'alloy') {
    try {
      const response = await this.openai.beta.realtime.sessions.create({
        model: 'gpt-4o-mini-realtime-preview-2024-12-17',
        voice: voice
      });

      return {
        status: 'success',
        ephemeralKey: response.ephemeral_key,
        expiresAt: response.expires_at,
        sessionId: response.id,
        model: response.model
      };
    } catch (error) {
      throw new OpenAIError(`Ephemeral key generation failed: ${error.message}`);
    }
  }



  formatDiscoData(data) {
    const formatField = (field) => {
      if (Array.isArray(field)) {
        return field.join(', ');
      }
      return field || 'None yet';
    };

    return {
      Decision_Criteria: formatField(data.Decision_Criteria),
      Impact: formatField(data.Impact),
      Situation: formatField(data.Situation),
      Challenges: formatField(data.Challenges),
      Objectives: formatField(data.Objectives)
    };
  }

  parseAiChatResponse(response) {
    const jsonMatch = response.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new OpenAIError('Invalid JSON response from OpenAI');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.response) {
        throw new OpenAIError('Missing response field in AI chat response');
      }
      return parsed;
    } catch (error) {
      throw new OpenAIError(`Failed to parse JSON: ${error.message}`);
    }
  }

  parseQuickAnalysisResponse(response) {
    const jsonMatch = response.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new OpenAIError('Invalid JSON response from OpenAI');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.analysis) {
        throw new OpenAIError('Missing analysis field in quick analysis response');
      }
      return parsed;
    } catch (error) {
      throw new OpenAIError(`Failed to parse JSON: ${error.message}`);
    }
  }



  parseDiscoResponse(response) {
    const jsonMatch = response.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new OpenAIError('Invalid JSON response from OpenAI');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const requiredFields = ['Decision_Criteria', 'Impact', 'Situation', 'Challenges', 'Objectives'];
      
      for (const field of requiredFields) {
        if (!parsed[field]) {
          parsed[field] = 'None yet';
        }
      }
      
      return parsed;
    } catch (error) {
      throw new OpenAIError(`Failed to parse JSON: ${error.message}`);
    }
  }
}

module.exports = { OpenAIService, OpenAIError }; 