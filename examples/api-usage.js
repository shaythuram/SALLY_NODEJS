const axios = require('axios');

// Configuration
const API_BASE_URL = 'http://localhost:3000';

// Example usage of the Sales Coaching API
async function exampleUsage() {
  console.log('🚀 Sales Coaching API Examples\n');

  try {
    // 1. Health Check
    console.log('1. Health Check:');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Health Status:', healthResponse.data);
    console.log('');

    // 2. AI Chat Mode
    console.log('2. AI Chat Mode:');
    const aiChatData = {
      ai_chat: true,
      user_query: "How do I handle price objections during a sales call?"
    };

    try {
      const aiChatResponse = await axios.post(
        `${API_BASE_URL}/api/generate-quick-answer`,
        aiChatData
      );
      console.log('✅ AI Chat Response:', aiChatResponse.data);
    } catch (error) {
      console.log('❌ AI Chat Error:', error.response?.data || error.message);
    }
    console.log('');

    // 3. Quick Analysis Mode
    console.log('3. Quick Analysis Mode:');
    const quickAnalysisData = {
      ai_chat: false,
      conversation: "salesperson: Hi, how can I help you today?\ncustomer: We're struggling with our current support system. Response times are too slow."
    };

    try {
      const quickAnalysisResponse = await axios.post(
        `${API_BASE_URL}/api/generate-quick-answer`,
        quickAnalysisData
      );
      console.log('✅ Quick Analysis Response:', quickAnalysisResponse.data);
    } catch (error) {
      console.log('❌ Quick Analysis Error:', error.response?.data || error.message);
    }
    console.log('');

    // 4. DISCO Analysis
    console.log('4. DISCO Analysis:');
    const discoData = {
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

    try {
      const discoResponse = await axios.post(
        `${API_BASE_URL}/api/analyze-disco`,
        discoData
      );
      console.log('✅ DISCO Analysis:', discoResponse.data);
    } catch (error) {
      console.log('❌ DISCO Analysis Error:', error.response?.data || error.message);
    }
    console.log('');

    // 5. Ephemeral Key Generation
    console.log('5. Ephemeral Key Generation:');
    const ephemeralKeyData = {
      voice: "alloy"
    };

    try {
      const ephemeralKeyResponse = await axios.post(
        `${API_BASE_URL}/api/realtime/ephemeral-key`,
        ephemeralKeyData
      );
      console.log('✅ Ephemeral Key:', ephemeralKeyResponse.data);
    } catch (error) {
      console.log('❌ Ephemeral Key Error:', error.response?.data || error.message);
    }
    console.log('');

    // 6. Error Handling Examples
    console.log('6. Error Handling Examples:');
    
    // Missing required field
    try {
      await axios.post(`${API_BASE_URL}/api/generate-quick-answer`, {});
    } catch (error) {
      console.log('✅ Validation Error (Missing ai_chat):', error.response?.data);
    }

    // Missing user_query when ai_chat is true
    try {
      await axios.post(`${API_BASE_URL}/api/generate-quick-answer`, {
        ai_chat: true
      });
    } catch (error) {
      console.log('✅ Validation Error (Missing user_query):', error.response?.data);
    }

    // Missing conversation when ai_chat is false
    try {
      await axios.post(`${API_BASE_URL}/api/generate-quick-answer`, {
        ai_chat: false
      });
    } catch (error) {
      console.log('✅ Validation Error (Missing conversation):', error.response?.data);
    }

    // 404 Error
    try {
      await axios.get(`${API_BASE_URL}/unknown-endpoint`);
    } catch (error) {
      console.log('✅ 404 Error:', error.response?.data);
    }

  } catch (error) {
    console.error('❌ Example execution failed:', error.message);
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  exampleUsage().catch(console.error);
}

module.exports = { exampleUsage }; 