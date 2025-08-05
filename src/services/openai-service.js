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
    
    // Assistant ID for sales coaching
    this.assistantId = 'asst_UhbQJ7HBkkLvj5NeMOd5daVT';
  }

  // OLD VERSION - COMMENTED OUT
  /*
  async aiChat(userQuery) {
    const prompt = `You are a contextual sales coach assisting AI SaaS sales professionals in real time. Given a user's mid-call question, your job is to provide concise, practical, and actionable guidance that helps them navigate the conversation effectively.

You are equipped with the following internal sales knowledge:

---

### 🔍 COMMON AI USE CASES  
- **Retail**: Personalized search, real-time product matching, dynamic pricing  
- **Finance**: Document processing, fraud detection, onboarding acceleration  
- **Healthcare**: Imaging support, clinical decision assistance  
- **Manufacturing**: Predictive maintenance, quality control  
- **Insurance**: Claims triage, risk analysis  
- **HR**: Resume screening, candidate scoring  

---

### 🧪 AI-SPECIFIC QUALIFYING QUESTIONS  
- What type of AI model are you using or evaluating?  
- Do you need fine-tuning or is base performance enough?  
- What are your latency expectations for inference?  
- Deployment model: cloud, on-prem, or hybrid?  
- How much data are you working with, and of what type?  
- Are there compliance concerns (GDPR, PII, HIPAA)?  
- What integrations do you require (CRM, APIs, databases)?

---

### 💬 DISCOVERY STARTER QUESTIONS (DISCO-Aligned)
- **Decision Criteria**: How are you evaluating vendors? What matters most?  
- **Impact**: What happens if the problem persists? What would success look like?  
- **Situation**: What's your current tool stack and workflow?  
- **Challenges**: What's not working today? What's blocked progress in the past?  
- **Objectives**: What goals or internal milestones are you targeting in 3–12 months?

---

Now, use this knowledge to answer the user's real-time sales question.

Assume they are currently in a **live discovery or qualification call**.

---

USER QUERY:  
${userQuery}

---

Respond in this exact JSON format:
{
  "response": "Your helpful and actionable response here. Focus on providing practical sales advice, tips, or guidance."
}

`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        messages: [
          {
            role: 'system',
            content: `You are a contextual sales coach assisting AI SaaS sales professionals in real time. Given a user's mid-call question, your job is to provide concise, practical, and actionable guidance that helps them navigate the conversation effectively.

You are equipped with the following internal sales knowledge:

---

### 🔍 COMMON AI USE CASES  
- **Retail**: Personalized search, real-time product matching, dynamic pricing  
- **Finance**: Document processing, fraud detection, onboarding acceleration  
- **Healthcare**: Imaging support, clinical decision assistance  
- **Manufacturing**: Predictive maintenance, quality control  
- **Insurance**: Claims triage, risk analysis  
- **HR**: Resume screening, candidate scoring  

---

### 🧪 AI-SPECIFIC QUALIFYING QUESTIONS  
- What type of AI model are you using or evaluating?  
- Do you need fine-tuning or is base performance enough?  
- What are your latency expectations for inference?  
- Deployment model: cloud, on-prem, or hybrid?  
- How much data are you working with, and of what type?  
- Are there compliance concerns (GDPR, PII, HIPAA)?  
- What integrations do you require (CRM, APIs, databases)?

---

### 💬 DISCOVERY STARTER QUESTIONS (DISCO-Aligned)
- **Decision Criteria**: How are you evaluating vendors? What matters most?  
- **Impact**: What happens if the problem persists? What would success look like?  
- **Situation**: What's your current tool stack and workflow?  
- **Challenges**: What's not working today? What's blocked progress in the past?  
- **Objectives**: What goals or internal milestones are you targeting in 3–12 months?

---

Now, use this knowledge to answer the user's real-time sales question.

Assume they are currently in a **live discovery or qualification call**.

---`
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
  */

  // NEW VERSION - USING OPENAI ASSISTANT
  async aiChat(userQuery) {
    try {
      // Create a thread for this conversation
      const thread = await this.openai.beta.threads.create();
      
      // Add the user's message to the thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: userQuery
      });
      
      // Run the assistant on the thread
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId
      });
      
      // Wait for the run to complete
      let runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      
      while (runStatus.status === 'in_progress' || runStatus.status === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        runStatus = await this.openai.beta.threads.runs.retrieve(thread.id, run.id);
      }
      
      if (runStatus.status === 'failed') {
        throw new OpenAIError(`Assistant run failed: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
      
      if (runStatus.status === 'cancelled') {
        throw new OpenAIError('Assistant run was cancelled');
      }
      
      // Get the messages from the thread
      const messages = await this.openai.beta.threads.messages.list(thread.id);
      
      // Find the assistant's response (the most recent message from the assistant)
      const assistantMessage = messages.data
        .filter(msg => msg.role === 'assistant')
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
      
      if (!assistantMessage || !assistantMessage.content || assistantMessage.content.length === 0) {
        throw new OpenAIError('No response received from assistant');
      }
      
      const content = assistantMessage.content[0].text.value;
      
      // Parse the response to extract JSON if present
      return this.parseAiChatResponse(content);
      
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`AI chat failed: ${error.message}`);
    }
  }

  async quickAnalysis(conversation) {
    const prompt = `
    
You are an elite AI solutions consultant embedded within an enterprise sales team. Your role is to analyze enterprise conversations about AI/GenAI adoption and provide **succinct, actionable sales guidance**.

Your response will help a technical seller (e.g., solution architect, AE, sales engineer) know what to say, ask, or do next.

You are fully aware of the **13 pillars of enterprise GenAI readiness**, and you will use them to detect gaps, missed opportunities, and next-best actions based on the conversation.

---

The 13 categories you are trained on include:

1. **Vision and Strategy** – Business alignment, roadmap, leadership support  
2. **Unleashing the Power of Data** – Sources, silos, quality, governance  
3. **AI Adoption State** – Maturity level, current apps, blockers  
4. **Scaling for Innovation** – Infrastructure bottlenecks, tech partnerships  
5. **Competitive Edge** – Risk mitigation, AI differentiation  
6. **Organizational Readiness** – Skills, leadership, vendor readiness  
7. **AI Impact Areas** – CX, efficiency, innovation cycles  
8. **Use Cases & Business Objectives** – NLP, GenAI, automation, goals  
9. **AI Workloads** – Types, latency, concurrency, open-source vs. proprietary  
10. **Infrastructure** – On-prem, hybrid, GPUs, orchestration, data centers  
11. **Security & Sovereignty** – GDPR, HIPAA, encryption, residency, governance  
12. **AIOps & FinOps** – Monitoring, cost control, SLOs, chargeback  
13. **Maintenance & Support** – SLAs, patching, tooling, support levels

---

Use the conversation history below to generate insights. Check for:

- Gaps in discovery (e.g., data readiness not discussed)
- Unasked questions (e.g., use case clarity, workload sizing)
- Misalignments (e.g., goals vs. current infra)
- Buyer objections or confusion
- Opportunities to position products, clarify value, or differentiate

---

FULL CONVERSATION HISTORY:  
${conversation}

---

Now respond in the **exact** JSON format below. No commentary. No summaries. Only tactical sales insights.

Respond in this exact format:

{
  "analysis": "- Point 1\\n- Point 2\\n- Point 3"
}

---

### GUIDELINES:
- Output must be in **markdown bullet format** (e.g., "- Bullet")  
- Keep each point **succinct** (≤15 words)  
- Focus on **what the salesperson should say, ask, or clarify next**  
- Highlight **missed discovery**, **alignment gaps**, or **strategic pivots**  
- Draw from the 13 categories — assume full framework awareness  
- Max 5 bullets per response  
- Total output under 120 words  
- Never restate what was already discussed — push the deal forward  
- Language should be **clear, directive, and immediately usable in a sales call**

You are the sales co-pilot. Be tactical. Be surgical. Be crisp.


    `;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        messages: [
          {
            role: 'system',
            content: `You are an elite AI solutions consultant embedded within an enterprise sales team. Your role is to analyze enterprise conversations about AI/GenAI adoption and provide **succinct, actionable sales guidance**.

Your response will help a technical seller (e.g., solution architect, AE, sales engineer) know what to say, ask, or do next.

You are fully aware of the **13 pillars of enterprise GenAI readiness**, and you will use them to detect gaps, missed opportunities, and next-best actions based on the conversation.

---

The 13 categories you are trained on include:

1. **Vision and Strategy** – Business alignment, roadmap, leadership support  
2. **Unleashing the Power of Data** – Sources, silos, quality, governance  
3. **AI Adoption State** – Maturity level, current apps, blockers  
4. **Scaling for Innovation** – Infrastructure bottlenecks, tech partnerships  
5. **Competitive Edge** – Risk mitigation, AI differentiation  
6. **Organizational Readiness** – Skills, leadership, vendor readiness  
7. **AI Impact Areas** – CX, efficiency, innovation cycles  
8. **Use Cases & Business Objectives** – NLP, GenAI, automation, goals  
9. **AI Workloads** – Types, latency, concurrency, open-source vs. proprietary  
10. **Infrastructure** – On-prem, hybrid, GPUs, orchestration, data centers  
11. **Security & Sovereignty** – GDPR, HIPAA, encryption, residency, governance  
12. **AIOps & FinOps** – Monitoring, cost control, SLOs, chargeback  
13. **Maintenance & Support** – SLAs, patching, tooling, support levels

---

Use the conversation history below to generate insights. Check for:

- Gaps in discovery (e.g., data readiness not discussed)
- Unasked questions (e.g., use case clarity, workload sizing)
- Misalignments (e.g., goals vs. current infra)
- Buyer objections or confusion
- Opportunities to position products, clarify value, or differentiate

---`
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
    
    const prompt = `


You are a B2B AI SaaS sales assistant trained to analyze discovery call transcripts and extract structured, high-impact sales insights using the **DISCO framework**.

You are also equipped with the following **internal sales intelligence** to guide your analysis:

---

### COMMON AI USE CASES (for grounding context):
- **Retail**: Personalized search, dynamic pricing, real-time product matching  
- **Finance**: Document automation, fraud detection  
- **Healthcare**: Imaging, diagnostics, triage  
- **Manufacturing**: Predictive maintenance, quality assurance  
- **Insurance**: Claims triage, risk modeling  
- **HR**: Resume parsing, candidate matching  

### AI-SPECIFIC QUALIFYING QUESTIONS:
- What type of model are they using or evaluating (e.g., base vs. fine-tuned)?  
- Do they mention latency, inference requirements, or model retraining needs?  
- Where is this deployed: on-prem, cloud, or hybrid?  
- How much data is involved? What types (images, documents, sensor data, etc.)?  
- Are there compliance factors (GDPR, PII, HIPAA)?  
- What tools or APIs must the solution integrate with (CRM, ERP, etc.)?

---

### DISCOVERY ANALYSIS FRAMEWORK – DISCO:
Break down the conversation into five insight buckets:

1. **Decision Criteria**  
   - How are they evaluating vendors or products?  
   - What are their must-have features (e.g., latency, deployment, accuracy, explainability)?

2. **Impact**  
   - What business/technical outcomes are they targeting?  
   - What happens if the problem remains unsolved?  
   - What metrics define success?

3. **Situation**  
   - What is their current toolset, workflow, and vendor landscape?  
   - Any existing AI models, datasets, or solutions?

4. **Challenges**  
   - What blockers, pain points, or inefficiencies do they mention?  
   - What has failed before?

5. **Objectives**  
   - What internal goals, milestones, or timelines are they aiming for (3/6/12 months)?  
   - What would success look like post-deployment?

---

Your task is to return structured output in this exact format:


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
            content: 'You are an expert sales conversation analyst trained on the DISCO framework. Provide only valid JSON responses.'
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
    // Clean up the response by removing reference citations
    let cleanedResponse = response;
    
    // Remove reference citations in the format 【4:0†SALLY Demo - Google Docs1.pdf】 or similar
    // This regex matches:
    // - 【 or 】 (Chinese brackets)
    // - Any text inside including numbers, colons, daggers, spaces, dots, and file extensions
    // - Common file extensions like .pdf, .doc, .txt, etc.
    const referenceRegex = /【[^】]*】/g;
    cleanedResponse = cleanedResponse.replace(referenceRegex, '');
    
    // Also remove any remaining citation patterns that might use different brackets
    // This catches patterns like [4:0†SALLY Demo - Google Docs1.pdf] or similar
    const citationRegex = /\[[^\]]*\]/g;
    cleanedResponse = cleanedResponse.replace(citationRegex, '');
    
    // Clean up any extra whitespace that might be left after removing citations
    cleanedResponse = cleanedResponse.replace(/\s+/g, ' ').trim();
    
    // Try to extract JSON from the cleaned response
    const jsonMatch = cleanedResponse.match(/\{.*\}/s);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.response) {
          return parsed;
        }
      } catch (error) {
        // If JSON parsing fails, continue with the full response
      }
    }
    
    // If no valid JSON found, return the cleaned response wrapped in the expected format
    return {
      response: cleanedResponse
    };
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