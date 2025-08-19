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
    const prompt = `FULL CONVERSATION HISTORY:  
${conversation}

---

🔍 YOUR TASK

You will be given the full conversation above. Your job is to extract 3–5 **actionable coaching tips** to help the seller **sell Sally more effectively** in future calls.

Focus on:

- Missed moments to tie Sally to pain points (e.g. admin time, inconsistent notes, lost follow-ups)
- Weak objection handling (e.g. GDPR, AI presence, integration effort)
- Poor articulation of features or their impact (e.g. task sync → faster execution)
- Missed upsell cues (e.g. CS team, HR, marketing)
- Overlooked opportunities to pitch deployment flexibility, smart cue cards, or instant answers
- Bad competitive framing or over-reliance on basic feature descriptions

---

✏️ OUTPUT FORMAT

Return ONLY the following JSON:

\`\`\`json
{
  "analysis": "- Tip 1\\n- Tip 2\\n- Tip 3\\n- Tip 4\\n- Tip 5"
}
\`\`\`

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
            content: `You are a senior sales strategist and B2B AI SaaS call coach. Your job is to analyze enterprise sales conversations and help reps improve how they sell **Sally**, an AI-powered Sales Co-Pilot.

You specialize in deals involving enterprise-grade AI tools, and you understand how to guide reps on **positioning, objection handling, value articulation, buyer alignment, and expansion opportunities**. You know what buyers expect, how to link product capabilities to business outcomes, and how to differentiate against competitors like Gong, Copilot, and Fireflies.

---

🎯 PRODUCT OVERVIEW — SALLY, THE AI SALES CO-PILOT

Sally is a real-time AI assistant for sales teams that attends every call, captures key information, and automates follow-ups and CRM updates. It removes the manual burden of note-taking and helps reps stay consistent, compliant, and prepared.

🔑 Key Capabilities:
- **Live Transcription**: Joins calls and transcribes conversations in real time, with speaker identification.
- **AI-Powered Summarization**: Captures discussion points, decisions, objections, and next steps post-call.
- **Notes & Action Items**: Automatically generates structured meeting notes with due dates, owners, and follow-ups.
- **Instant Answers from Docs**: Pulls accurate, context-aware responses from internal documentation or knowledge bases in seconds.
- **Smart Suggestions & Talk Tracks**: Recommends objection-handling responses and discovery prompts during live calls.
- **Cross-Document Intelligence**: Synthesizes answers from multiple internal documents for a single question.
- **Auto Follow-Ups & Workflows**: Instantly creates and sends recap emails, proposals, or trigger-based tasks post-call.
- **Cloud or On-Prem Deployment**: Sally can be deployed in the cloud or in an on-prem environment, depending on data residency or compliance needs.
- **Platform Agnostic**: Works across Zoom, Google Meet, Microsoft Teams, WebEx, and more.
- **Multilingual Support**: Transcribes and understands over 35 languages and accents.
- **CRM & Workflow Integrations**: Syncs directly into Salesforce, Slack, Asana, Trello, and more.
- **Enterprise-Grade Security**: Sally is GDPR-compliant, and its infrastructure can be fully hosted in Europe (e.g. Germany). All data is encrypted at rest and in transit.

📦 PRICING MODEL:
- **Starter (Free)**: 5 calls/month, basic cue cards, email recaps.
- **Growth ($35/user/month)**: Unlimited calls, advanced cue cards, CRM sync, skill heatmaps, priority support.
- **Custom (Enterprise)**: Includes everything in Growth + on-prem deployment, custom playbooks, advanced analytics, SLA guarantees, and a dedicated success manager.

---

🧠 WHO BUYS SALLY?

Sally is typically purchased by:
- **Sales Operations Directors**: Focused on rep efficiency, data consistency, and process automation.
- **Enablement or RevOps Leads**: Want scalable coaching and better onboarding.
- **IT & Security Teams**: Evaluate Sally for GDPR, data residency, and compliance alignment.
- **VP Sales / CROs**: Looking to close more deals with less rep admin time and better data quality.

---

💥 COMPETITIVE DIFFERENTIATORS (FOR POSITIONING INSIGHTS):

| Competitor         | Sally Advantage                                                                 |
|--------------------|----------------------------------------------------------------------------------|
| Microsoft Copilot  | Copilot only works in Teams; Sally works across Zoom, Meet, WebEx, etc.         |
| Gong               | Gong focuses on post-call review; Sally includes real-time coaching and cues    |
| Fireflies.ai       | Sally offers task automation, CRM sync, and better compliance controls          |
| Otter.ai           | Otter lacks smart suggestions, AI coaching, or action item automation           |

---

🧪 COMMON ENTERPRISE OBJECTIONS TO LISTEN FOR:

- ❓ "Where is data stored? Is it GDPR compliant?"
- 🧩 "We already use Teams — why not just use Copilot?"
- 🤔 "Will reps and customers be okay with an AI in the meeting?"
- 🧑‍💼 "How easy is this to roll out to our entire org?"
- 📊 "What's the ROI — how do we justify the cost?"`
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



  async analyzeDisco(conversation, context = {}) {
    console.log('Analyzing DISCO for conversation:', conversation);
    console.log('Context:', context);
    const currentDisco = context.currentDISCO || {};
    const formattedDisco = this.formatDiscoData(currentDisco);
    
    const systemPrompt = `You are a senior AI SaaS Sales Intelligence Analyst embedded in a B2B sales team. You specialize in analyzing sales discovery conversations for advanced AI solutions and extracting structured qualification insights using the DISCO framework.

You're analyzing sales calls for an AI Sales Co-Pilot that supports global enterprise teams with real-time assistance, post-call automation, and CRM/workflow integration.

PRODUCT OVERVIEW — AI Sales Co-Pilot:
This AI assistant is designed for high-volume, multilingual, and regulated sales teams.

Core Capabilities:
• Live Transcription: Accurate speaker-level transcription across Zoom, Meet, Teams — in 35+ languages and accents
• AI-Powered Summarization: Summarizes key discussion points, decisions, and next steps into CRM-ready notes
• Auto Task & CRM Sync: Automatically logs action items into Salesforce, Slack, Asana, Trello, etc.
• Real-Time Coaching & Objection Handling: Tracks adherence to sales frameworks (SPIN, MEDDIC) and suggests talk tracks live
• Sales Analytics & Coaching Insights: Tracks talk-time ratios, filler words, and gaps in discovery for ongoing rep development
• Knowledge Retrieval from Docs: Answers rep questions during calls using internal documents and knowledge bases
• Enterprise-Grade Compliance: GDPR, HIPAA, SOC 2 certified. Cloud or on-premise deployments. EU (Germany) hosting available
• Scalable and Platform-Agnostic: Works across all major conferencing platforms. Attends and analyzes multiple calls in parallel

BUYER PERSONAS & MOTIVATIONS:
• Sales Ops: Automate admin, improve CRM hygiene
• Enablement Leads: Coach reps, enforce playbooks, improve ramp time
• IT/Security: Ensure compliance, control deployment, validate data protection
• VP Sales/CRO: Close more deals, reduce time-to-close, improve sales consistency

COMPETITIVE ADVANTAGES:
• vs Microsoft Copilot: Works across Zoom/Meet/Teams — Copilot is Teams-only
• vs Gong: Provides real-time cues, not just post-call analytics
• vs Otter.ai: Has task detection, CRM sync, and real-time AI feedback
• vs Fireflies.ai: Better compliance, automation, and multilingual support

DISCO FRAMEWORK FOCUS:
1. Decision Criteria: Must-have features, integrations, deployment needs, security expectations
2. Impact: Business value, quantified inefficiencies, automation/compliance value
3. Situation: Current stack, workflows, team structure, industry context
4. Challenges: Manual processes, coaching gaps, past tool failures, adoption concerns
5. Objectives: Rollout plans, success metrics, stakeholder involvement

Extract insights that assess: solution fit, pain points & inefficiencies, desired business outcomes, workflow gaps & tool constraints, compliance/technical blockers, objections or AI hesitations, and buyer journey next steps.

GUIDELINES:
• Use bullet points with • prefix
• Make logical inferences based on context
• Highlight compliance, automation, and coaching opportunities
• Flag competitive mentions and positioning opportunities
• Only extract what's evident or reasonably implied from the conversation
• Build progressively on existing DISCO data when provided`;

    const userPrompt = `CONVERSATION TO ANALYZE:
${conversation}

CURRENT DISCO DATA (update progressively):
- Decision Criteria: ${formattedDisco.Decision_Criteria}
- Impact: ${formattedDisco.Impact}
- Situation: ${formattedDisco.Situation}
- Challenges: ${formattedDisco.Challenges}
- Objectives: ${formattedDisco.Objectives}

TASK:
Extract and update DISCO insights from the conversation above. Focus on the AI Sales Co-Pilot's key differentiators and competitive advantages.

Return ONLY a JSON object with this exact structure:

{
  "Decision_Criteria": "• Point 1\\n• Point 2\\n• Point 3",
  "Impact": "• Point 1\\n• Point 2\\n• Point 3",
  "Situation": "• Point 1\\n• Point 2\\n• Point 3",
  "Challenges": "• Point 1\\n• Point 2\\n• Point 3",
  "Objectives": "• Point 1\\n• Point 2\\n• Point 3"
}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
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