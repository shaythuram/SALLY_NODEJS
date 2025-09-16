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
  async aiChat(userQuery, assistantId = null, threadId = null) {
    try {
      // Use provided assistantId or default
      const targetAssistantId = assistantId || this.assistantId;
      
      // Use provided threadId or create a new thread
      let thread;
      if (threadId) {
        thread = { id: threadId };
      } else {
        thread = await this.openai.beta.threads.create();
      }
      
      // Add the user's message to the thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: userQuery
      });
      
      // Run the assistant on the thread
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: targetAssistantId
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

  async quickAnalysis(conversation, assistantId = null, threadId = null) {
    try {
      // Use provided assistantId or default
      const targetAssistantId = assistantId || this.assistantId;
      
      // Use provided threadId or create a new thread
      let thread;
      if (threadId) {
        thread = { id: threadId };
      } else {
        thread = await this.openai.beta.threads.create();
      }
      
      // Add the conversation analysis request to the thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: `Analyze this conversation and provide exactly 3 coaching insights. If no valuable insights can be extracted, respond with "No valuable insights available":

CONVERSATION:
${conversation}

Based on your knowledge and any available context, provide coaching insights in JSON format:
{
  "analysis": "- Tip 1\\n- Tip 2\\n- Tip 3"
}`
      });
      
      // Run the assistant on the thread
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: targetAssistantId
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
      
      return this.parseQuickAnalysisResponse(content);
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`Quick analysis failed: ${error.message}`);
    }
  }



  async analyzeDisco(conversation, context = {}, assistantId = null, threadId = null) {
    console.log('Analyzing DISCO for conversation:', conversation);
    console.log('Context:', context);
    const currentDisco = context.currentDISCO || {};
    const formattedDisco = this.formatDiscoData(currentDisco);
    
    const systemPrompt = `You are a senior AI SaaS Sales Intelligence Analyst with deep expertise in B2B sales discovery and the DISCO framework. You analyze sales conversations to extract comprehensive, contextual insights that help sales teams understand buyer needs, pain points, and decision-making processes.

You're analyzing conversations for SALLY, an AI Sales Co-Pilot that revolutionizes how sales teams conduct discovery calls, manage follow-ups, and maintain CRM hygiene.

🎯 SALLY PRODUCT DEEP DIVE:

CORE CAPABILITIES:
• **Real-Time Transcription & Analysis**: Live speaker-level transcription across Zoom, Meet, Teams, WebEx in 35+ languages with accent recognition
• **Intelligent Cue Cards**: Context-aware coaching prompts that appear during calls based on conversation flow and DISCO framework gaps
• **Automated CRM Integration**: Seamless sync with Salesforce, HubSpot, Pipedrive - auto-populates fields, creates tasks, logs activities
• **Post-Call Automation**: Generates meeting summaries, follow-up emails, action items, and next steps automatically
• **Knowledge Base Integration**: Instant access to internal docs, playbooks, pricing sheets during live calls
• **Sales Analytics & Coaching**: Tracks talk-time ratios, discovery completeness, objection handling, and provides coaching insights
• **Multi-Platform Support**: Works across all major conferencing platforms simultaneously
• **Enterprise Security**: GDPR, HIPAA, SOC 2 Type II certified with on-premise and cloud deployment options

TARGET BUYER PERSONAS & THEIR MOTIVATIONS:

**Sales Operations Leaders:**
• Pain: Manual CRM updates, inconsistent data quality, admin overhead
• Goals: Automate data entry, improve CRM hygiene, reduce rep admin time
• Success Metrics: Time saved per rep, data accuracy improvements, pipeline visibility

**Sales Enablement & Training:**
• Pain: Inconsistent discovery, poor objection handling, long ramp times
• Goals: Standardize processes, improve rep performance, accelerate onboarding
• Success Metrics: Discovery completion rates, objection handling scores, time-to-productivity

**IT & Security Teams:**
• Pain: Data security concerns, compliance requirements, integration complexity
• Goals: Ensure data protection, maintain compliance, control deployment
• Success Metrics: Security audit results, compliance certifications, data residency

**VP Sales & CROs:**
• Pain: Inconsistent sales processes, missed follow-ups, poor forecasting
• Goals: Increase win rates, improve forecasting accuracy, scale efficiently
• Success Metrics: Win rate improvements, forecast accuracy, revenue per rep

COMPETITIVE LANDSCAPE & DIFFERENTIATION:

**vs Microsoft Copilot:**
• SALLY works across ALL platforms (Zoom, Meet, Teams, WebEx) - Copilot is Teams-only
• SALLY provides real-time coaching cues - Copilot is post-call only
• SALLY has dedicated CRM integration - Copilot lacks deep CRM connectivity

**vs Gong:**
• SALLY provides LIVE coaching during calls - Gong is retrospective analysis
• SALLY automates follow-ups and CRM updates - Gong requires manual work
• SALLY offers real-time objection handling - Gong only identifies issues post-call

**vs Otter.ai:**
• SALLY includes CRM integration and task automation - Otter is transcription-only
• SALLY provides sales-specific coaching and analytics - Otter is generic meeting notes
• SALLY offers enterprise security and compliance - Otter has limited enterprise features

**vs Fireflies.ai:**
• SALLY has superior multilingual support (35+ languages) - Fireflies supports fewer languages
• SALLY offers real-time coaching and cue cards - Fireflies is post-call analysis
• SALLY provides better CRM integration and automation - Fireflies has basic integrations

DISCO FRAMEWORK ANALYSIS APPROACH:

**Decision Criteria (What matters most to them):**
• Technical requirements (integrations, security, compliance)
• Feature priorities (transcription accuracy, real-time coaching, automation)
• Budget constraints and approval processes
• Timeline expectations and implementation requirements
• Vendor evaluation criteria and decision-making process

**Impact (Why this matters to their business):**
• Quantified pain points (time wasted, revenue lost, inefficiencies)
• Business outcomes they're trying to achieve
• Success metrics and KPIs they care about
• Competitive advantages they're seeking
• Risk mitigation and compliance needs

**Situation (Current state and context):**
• Current tech stack and tools they're using
• Team structure and roles involved
• Industry context and regulatory requirements
• Company size, growth stage, and maturity
• Geographic distribution and language needs

**Challenges (What's not working today):**
• Specific pain points with current solutions
• Process gaps and inefficiencies
• Previous failed implementations or tool changes
• Resource constraints and adoption challenges
• Technical or compliance blockers

**Objectives (What they want to achieve):**
• Short-term goals and immediate needs
• Long-term strategic objectives
• Success metrics and measurement criteria
• Timeline expectations and milestones
• Stakeholder involvement and change management

ANALYSIS GUIDELINES:
• Read the conversation carefully and understand the full context
• Extract both explicit statements and implied needs/concerns
• **If conversation is SALLY-specific**: Connect pain points to SALLY's specific capabilities and competitive advantages
• **If conversation is generic/vague**: Provide general sales discovery insights and best practices for B2B sales
• Identify competitive positioning opportunities when competitors are mentioned
• Highlight compliance, security, and technical requirements when relevant
• Note decision-making processes and stakeholder involvement
• Build progressively on existing DISCO data when provided
• Use bullet points with • prefix for clarity
• Focus on actionable insights that help advance the sale
• **Adapt analysis depth based on conversation specificity** - be more generic when conversation lacks specific details
• **BE CONCISE**: Maximum 3-4 items per DISCO category, 1-2 lines per bullet point
• **PRIORITIZE**: Focus on the most important and actionable insights only`;

    const userPrompt = `CONVERSATION TO ANALYZE:
${conversation}

CURRENT DISCO DATA (build upon existing insights):
- Decision Criteria: ${formattedDisco.Decision_Criteria}
- Impact: ${formattedDisco.Impact}
- Situation: ${formattedDisco.Situation}
- Challenges: ${formattedDisco.Challenges}
- Objectives: ${formattedDisco.Objectives}

ANALYSIS TASK:
Carefully analyze this sales conversation and extract comprehensive DISCO insights. Pay special attention to:

1. **Contextual Understanding**: Read the full conversation to understand the buyer's situation, pain points, and needs
2. **Pain Point Mapping**: 
   - **If SALLY-specific**: Connect challenges to SALLY's capabilities and competitive advantages
   - **If generic/vague**: Identify general business challenges and sales opportunities
3. **Competitive Intelligence**: Note any competitor mentions and identify positioning opportunities
4. **Decision Process**: Understand how decisions are made, who's involved, and what criteria matter
5. **Technical Requirements**: Identify integration needs, security concerns, and compliance requirements when mentioned
6. **Business Impact**: Quantify the value and outcomes the buyer is seeking

**ANALYSIS APPROACH:**
- **For SALLY-specific conversations**: Focus on how SALLY's features address their needs
- **For generic conversations**: Provide general sales discovery insights and best practices
- **For vague conversations**: Extract what you can and note areas that need more discovery

For each DISCO category, extract exactly 3-4 concise, actionable insights that will help advance the sale. Focus on:
- What the buyer explicitly stated
- What can be reasonably inferred from context
- **If SALLY-specific**: How SALLY's capabilities address their specific needs
- **If generic**: General sales strategies and discovery best practices
- Competitive advantages and differentiation opportunities when relevant
- Next steps and follow-up actions

**CONCISENESS REQUIREMENTS:**
- Maximum 3-4 items per DISCO category
- Each bullet point should be 1-2 lines maximum
- Be direct and to the point
- Avoid redundant or overlapping insights
- Prioritize the most important and actionable items

Return ONLY a JSON object with this exact structure:

{
  "Decision_Criteria": "• Concise requirement 1\\n• Concise requirement 2\\n• Concise requirement 3",
  "Impact": "• Key pain point 1\\n• Key pain point 2\\n• Key pain point 3",
  "Situation": "• Current state 1\\n• Current state 2\\n• Current state 3",
  "Challenges": "• Main challenge 1\\n• Main challenge 2\\n• Main challenge 3",
  "Objectives": "• Primary goal 1\\n• Primary goal 2\\n• Primary goal 3"
}

IMPORTANT: 
- **For SALLY-specific conversations**: Each bullet point should be specific, contextual, and actionable. Connect insights to SALLY's capabilities and competitive advantages.
- **For generic/vague conversations**: Provide general sales discovery insights and best practices. Focus on what can be reasonably inferred and suggest areas for further discovery.
- **Adapt the depth and specificity based on the conversation content** - be more generic when the conversation lacks specific details about SALLY or the product being sold.`;

    try {
      // Use provided assistantId or default
      const targetAssistantId = assistantId || this.assistantId;
      
      // Use provided threadId or create a new thread
      let thread;
      if (threadId) {
        thread = { id: threadId };
      } else {
        thread = await this.openai.beta.threads.create();
      }
      
      // Add the DISCO analysis request to the thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: `Analyze this conversation using the DISCO framework and extract structured insights:

CONVERSATION:
${conversation}

CURRENT DISCO DATA (build upon existing insights):
- Decision Criteria: ${formattedDisco.Decision_Criteria}
- Impact: ${formattedDisco.Impact}
- Situation: ${formattedDisco.Situation}
- Challenges: ${formattedDisco.Challenges}
- Objectives: ${formattedDisco.Objectives}

Based on your knowledge and any available context, provide DISCO analysis with exactly 3 points per category. If no valuable insights can be extracted, respond with "No valuable insights available":
{
  "Decision_Criteria": "• Criteria 1\\n• Criteria 2\\n• Criteria 3",
  "Impact": "• Impact 1\\n• Impact 2\\n• Impact 3",
  "Situation": "• Situation 1\\n• Situation 2\\n• Situation 3",
  "Challenges": "• Challenge 1\\n• Challenge 2\\n• Challenge 3",
  "Objectives": "• Objective 1\\n• Objective 2\\n• Objective 3"
}`
      });
      
      // Run the assistant on the thread
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: targetAssistantId
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
      
      return this.parseDiscoResponse(content);
    } catch (error) {
      if (error instanceof OpenAIError) {
        throw error;
      }
      throw new OpenAIError(`DISCO analysis failed: ${error.message}`);
    }
  }

  async generateEphemeralKey(voice = 'alloy', assistantId = null) {
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

  async analyzePostCallSteps(conversation, assistantId = null, threadId = null) {
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
      // Use provided assistantId or default
      const targetAssistantId = assistantId || this.assistantId;
      
      // Use provided threadId or create a new thread
      let thread;
      if (threadId) {
        thread = { id: threadId };
      } else {
        thread = await this.openai.beta.threads.create();
      }
      
      // Add the post-call steps analysis request to the thread
      await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: `Analyze this conversation and extract follow-up action items:

CONVERSATION:
${conversation}

Based on your knowledge and any available context, provide exactly 3 follow-up steps per category. If no valuable insights can be extracted, respond with "No valuable insights available":
{
  "followUpActions": "- Action 1\\n- Action 2\\n- Action 3",
  "informationGathering": "- Research 1\\n- Research 2\\n- Research 3",
  "stakeholderEngagement": "- Contact 1\\n- Contact 2\\n- Contact 3",
  "proposalPreparation": "- Prep 1\\n- Prep 2\\n- Prep 3",
  "internalCoordination": "- Task 1\\n- Task 2\\n- Task 3",
  "timelineManagement": "- Deadline 1\\n- Deadline 2\\n- Deadline 3"
}`
      });
      
      // Run the assistant on the thread
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: targetAssistantId
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
    // Handle "No valuable insights available" case
    if (response.includes('No valuable insights available')) {
      return { analysis: 'No valuable insights available' };
    }

    // Try to extract JSON from response
    const jsonMatch = response.match(/\{.*\}/s);
    if (!jsonMatch) {
      // If no JSON found, return the response as analysis
      return { analysis: response.trim() };
    }

    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (!parsed.analysis) {
        // If no analysis field, use the whole response
        return { analysis: response.trim() };
      }
      return parsed;
    } catch (error) {
      // If JSON parsing fails, return the response as analysis
      return { analysis: response.trim() };
    }
  }



  parseDiscoResponse(response) {
    // Handle "No valuable insights available" case
    if (response.includes('No valuable insights available')) {
      return {
        Decision_Criteria: 'No valuable insights available',
        Impact: 'No valuable insights available',
        Situation: 'No valuable insights available',
        Challenges: 'No valuable insights available',
        Objectives: 'No valuable insights available'
      };
    }

    // Try to extract JSON from response
    const jsonMatch = response.match(/\{.*\}/s);
    if (!jsonMatch) {
      // If no JSON found, return default structure
      return {
        Decision_Criteria: response.trim() || 'None yet',
        Impact: 'None yet',
        Situation: 'None yet',
        Challenges: 'None yet',
        Objectives: 'None yet'
      };
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
      // If JSON parsing fails, return default structure
      return {
        Decision_Criteria: response.trim() || 'None yet',
        Impact: 'None yet',
        Situation: 'None yet',
        Challenges: 'None yet',
        Objectives: 'None yet'
      };
    }
  }

  parsePostCallStepsResponse(response) {
    // Handle "No valuable insights available" case
    if (response.includes('No valuable insights available')) {
      return {
        followUpActions: 'No valuable insights available',
        informationGathering: 'No valuable insights available',
        stakeholderEngagement: 'No valuable insights available',
        proposalPreparation: 'No valuable insights available',
        internalCoordination: 'No valuable insights available',
        timelineManagement: 'No valuable insights available'
      };
    }

    // Try to extract JSON from response
    const jsonMatch = response.match(/\{.*\}/s);
    if (!jsonMatch) {
      // If no JSON found, return default structure
      return {
        followUpActions: response.trim() || 'None yet',
        informationGathering: 'None yet',
        stakeholderEngagement: 'None yet',
        proposalPreparation: 'None yet',
        internalCoordination: 'None yet',
        timelineManagement: 'None yet'
      };
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
      // If JSON parsing fails, return default structure
      return {
        followUpActions: response.trim() || 'None yet',
        informationGathering: 'None yet',
        stakeholderEngagement: 'None yet',
        proposalPreparation: 'None yet',
        internalCoordination: 'None yet',
        timelineManagement: 'None yet'
      };
    }
  }
}

module.exports = { OpenAIService, OpenAIError }; 