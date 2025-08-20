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
FULL CONVERSATION HISTORY:  
${conversation}

---

🔍 YOUR TASK

You are a sales strategist analyzing this sales conversation. Extract **3–5 sharp coaching tips** to help the seller pitch **SALLY**, the AI Sales Co-Pilot, more effectively next time.

🎯 SALLY SNAPSHOT (for reference):
- AI assistant for B2B sales teams
- Real-time transcription + cue cards across Zoom, Meet, Teams, WebEx
- Live answers from internal docs during calls
- Auto-generates summaries, follow-ups, tasks, and CRM sync
- Integrates with Salesforce, HubSpot, Google Drive, Slack
- Supports both on-premise and cloud
- SOC-2 Type II, GDPR, HIPAA compliant with EU hosting
- 35+ language support for global orgs
- Beats Gong, Otter, Fireflies with real-time coaching + automation

---

🧠 Focus areas:
- Missed pain tie-ins (e.g. admin time, follow-up gaps, inconsistent CRM hygiene)
- Poor objection handling (e.g. AI presence, compliance, IT pushback)
- Weak feature→impact mapping (e.g. cue cards = consistency; doc search = faster objection handling)
- Missed upsell cues (CS, HR, multilingual teams, security)
- Weak competitive positioning (e.g. Gong = post-call; Sally = live coaching)

---

✏️ OUTPUT FORMAT

Return ONLY the following JSON:

\`\`\`json
{
  "analysis": "- Tip 1\\n- Tip 2\\n- Tip 3\\n- Tip 4\\n- Tip 5"
}
\`\`\`

🎯 RULES:
- 3–5 tips total
- Each bullet = ≤15 words
- Use markdown dash format (- Tip)
- Push the deal forward — don’t repeat what happened
- Be tactical, clear, and sharp — no fluff
- Output must be under 120 words

---

📌 EXAMPLES (copy this tone + structure):

Input:
Call mentioned Gong didn’t integrate with CRM. Buyer unsure about AI in meetings.

Output:
\`\`\`json
{
  "analysis": "- Tie CRM sync to Gong gap\\n- Reassure AI presence with silent observer mode\\n- Emphasize on-prem hosting option\\n- Ask if CS faces same CRM pain\\n- Reinforce cue cards for message consistency"
}
\`\`\`

---

Input:
Rep pitched features well but ignored ROI questions and multilingual/global expansion.

Output:
\`\`\`json
{
  "analysis": "- Quantify 4–5 hrs/week saved\\n- Mention EU-hosting for GDPR\\n- Ask about language support needs\\n- Push CRM sync to show revenue impact\\n- Explore CS/Marketing team use cases"
}
\`\`\`

---

Input:
Rep focused on features but didn’t show impact. Missed coaching and security hooks.

Output:
\`\`\`json
{
  "analysis": "- Connect cue cards to pipeline consistency\\n- Highlight GDPR + HIPAA compliance for IT\\n- Ask about CS onboarding needs\\n- Reinforce multilingual support\\n- Pitch skill heatmaps for rep coaching"
}
\`\`\`

---

Now analyze the conversation above.

Output ONLY the final JSON. No explanation.
`



    ;

    try {
      const response = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.max_tokens,
        messages: [
          {
            role: 'system',
            content: 
            `
   You are a senior sales strategist and enterprise SaaS call coach. You are coaching reps selling **SALLY**, an AI-powered Sales Co-Pilot used by global B2B sales teams.

---

🧠 YOU KNOW SALLY INSIDE OUT.

SALLY is a real-time AI sales assistant designed to:
- Capture and structure live sales calls
- Reduce manual note-taking (saves ~4–5 hrs/week/rep)
- Automate follow-ups, emails, tasks, and CRM updates
- Provide real-time objection handling and cue cards
- Pull instant answers from internal docs or knowledge base
- Generate summaries, next steps, and action items post-call

💼 SALLY Integrates With:
- **CRMs**: Salesforce, HubSpot
- **Collaboration**: Zoom, Meet, Teams, WebEx, Slack
- **Storage**: Microsoft 365, Google Drive

📦 DEPLOYMENT
- Works in cloud or on-prem
- Fully GDPR, HIPAA, SOC-2 Type II compliant
- Offers data residency options (e.g., EU/Germany hosting)

🌍 GLOBAL-READY
- Real-time multilingual support (35+ languages)
- Perfect for regional or multinational sales teams

💸 PRICING
- Starter (Free): 5 calls/month
- Growth ($35/user/mo): Advanced cue cards, CRM sync, heatmaps
- Custom (Enterprise): On-prem, playbooks, analytics, SLA

---

🔎 WHO BUYS SALLY?

- **Sales Ops**: Wants CRM consistency and admin reduction
- **RevOps & Enablement**: Cares about ramp time, coaching, playbook adherence
- **IT & Security**: Needs GDPR/HIPAA, data control, deployment flexibility
- **CROs/VP Sales**: Want revenue with less rep effort

---

🧨 COMPETITOR EDGE

| Tool         | Sally Advantage                                                    |
|--------------|---------------------------------------------------------------------|
| Gong         | Gong is post-call; Sally coaches **live** with smart cue cards     |
| Otter.ai     | Otter lacks objection handling or follow-up automation             |
| Fireflies    | Weak on security & structured CRM sync                             |
| MS Copilot   | Only works in Teams; Sally is platform-agnostic + multilingual     |

---

🎯 YOUR GOAL

Extract up to 5 **specific coaching points** to improve how the rep sold Sally in this call.

Coach the rep on:
- Tying Sally to pain (admin, notes, missed follow-ups, CRM mess)
- Objection handling (AI, compliance, training effort)
- Feature-to-impact clarity (cue cards = talk track control; instant docs = faster objection handling)
- Missed upsell signals (e.g., CS, HR, multilingual teams)
- Buyer alignment gaps (CRO wants ROI; IT wants data control)
- Competitive clarity (Don’t just name-drop competitors — differentiate surgically)

Return ONLY a JSON block with markdown bullets under 120 words.

Be blunt. Be sharp. Be helpful.`         
            


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

  async analyzePostCallSteps(conversation) {
    console.log('Analyzing post-call steps for conversation:', conversation);
    
    const systemPrompt = `You are a senior sales strategist and post-call execution specialist. You analyze sales conversations and generate structured action items for **SALLY**, an AI-powered Sales Co-Pilot used by global B2B sales teams.

SALLY PRODUCT OVERVIEW:
SALLY is a real-time AI sales assistant designed to:
- Capture and structure live sales calls
- Reduce manual note-taking (saves ~4–5 hrs/week/rep)
- Automate follow-ups, emails, tasks, and CRM updates
- Provide real-time objection handling and cue cards
- Pull instant answers from internal docs or knowledge base
- Generate summaries, next steps, and action items post-call

💼 SALLY Integrates With:
- **CRMs**: Salesforce, HubSpot
- **Collaboration**: Zoom, Meet, Teams, WebEx, Slack
- **Storage**: Microsoft 365, Google Drive

📦 DEPLOYMENT
- Works in cloud or on-prem
- Fully GDPR, HIPAA, SOC-2 Type II compliant
- Offers data residency options (e.g., EU/Germany hosting)

🌍 GLOBAL-READY
- Real-time multilingual support (35+ languages)
- Perfect for regional or multinational sales teams

POST-CALL STEPS CATEGORIES:
1. **Follow-up Actions**: Immediate actions to maintain momentum
2. **Information Gathering**: Research and data collection needed
3. **Stakeholder Engagement**: People to connect with or involve
4. **Proposal/Demo Preparation**: Next meeting or presentation prep
5. **Internal Coordination**: Team alignment and resource planning
6. **Timeline Management**: Key dates and deadlines to track

GUIDELINES:
• Use markdown bullet points with - prefix
• Be specific and actionable  
• Include deadlines when mentioned or implied
• Prioritize by urgency and impact
• Reference specific conversation points
• Focus on advancing the sales process
• Each bullet point should be concise and actionable
• Use proper markdown formatting in the JSON strings`;

    const userPrompt = `CONVERSATION TO ANALYZE:
${conversation}

TASK:
Extract post-call action items from the conversation above. Focus on concrete next steps that will advance the SALLY sales opportunity.

Return ONLY a JSON object with this exact structure:

{
  "followUpActions": "- Action 1\\n- Action 2\\n- Action 3",
  "informationGathering": "- Research 1\\n- Research 2\\n- Research 3",
  "stakeholderEngagement": "- Stakeholder 1\\n- Stakeholder 2\\n- Stakeholder 3",
  "proposalPreparation": "- Prep item 1\\n- Prep item 2\\n- Prep item 3",
  "internalCoordination": "- Internal task 1\\n- Internal task 2\\n- Internal task 3",
  "timelineManagement": "- Deadline 1\\n- Deadline 2\\n- Deadline 3"
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

      return this.parsePostCallStepsResponse(content);
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`Post-call steps analysis failed: ${error.message}`);
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

  formatPostCallStepsData(data) {
    const formatField = (field) => {
      if (Array.isArray(field)) {
        return field.join('\n');
      }
      return field || 'None yet';
    };

    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      return {
        followUpActions: formatField(data.followUpActions),
        informationGathering: formatField(data.informationGathering),
        stakeholderEngagement: formatField(data.stakeholderEngagement),
        proposalPreparation: formatField(data.proposalPreparation),
        internalCoordination: formatField(data.internalCoordination),
        timelineManagement: formatField(data.timelineManagement)
      };
    }
    
    return {
      followUpActions: 'None yet',
      informationGathering: 'None yet',
      stakeholderEngagement: 'None yet',
      proposalPreparation: 'None yet',
      internalCoordination: 'None yet',
      timelineManagement: 'None yet'
    };
  }

  formatCustomerInfo(data) {
    if (typeof data === 'object' && data !== null) {
      const info = [];
      if (data.company) info.push(`Company: ${data.company}`);
      if (data.contact) info.push(`Contact: ${data.contact}`);
      if (data.title) info.push(`Title: ${data.title}`);
      if (data.email) info.push(`Email: ${data.email}`);
      if (data.industry) info.push(`Industry: ${data.industry}`);
      if (data.size) info.push(`Company Size: ${data.size}`);
      return info.length > 0 ? info.join('\n') : 'No customer info provided';
    }
    return 'No customer info provided';
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

  parsePostCallStepsResponse(response) {
    const jsonMatch = response.match(/\{.*\}/s);
    if (!jsonMatch) {
      throw new OpenAIError('Invalid JSON response from OpenAI');
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      const requiredFields = ['followUpActions', 'informationGathering', 'stakeholderEngagement', 'proposalPreparation', 'internalCoordination', 'timelineManagement'];
      
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