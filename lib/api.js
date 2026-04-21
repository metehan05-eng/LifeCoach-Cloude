import ky from "ky";

const baseUrl =
  process.env.NEXT_ENV === "production"
    ? "https://langchain-ui.vercel.app"
    : "http://localhost:3000";

const api = ky.create({ prefixUrl: baseUrl });

export const ingestData = async (data) =>
  ky.post("/api/datasources/ingest", { json: data }).json();

export const createDatasource = async (data) =>
  ky.post("/api/datasources", { json: data }).json();

export const createChatbot = async (data) =>
  ky.post("/api/chatbots", { json: data }).json();

export const createChatbotMessage = async (id, data) =>
  ky
    .post(`/api/chatbots/${id}/messages`, {
      json: { ...data },
      timeout: 60000,
    })
    .json();

export const createPromptTemplate = (data) =>
  ky.post("/api/prompt-templates", { json: data }).json();

export const getChatbotById = async (id) =>
  ky.get(`/api/chatbots/${id}`).json();

export const getChatbots = async () => ky.get("/api/chatbots").json();

export const getDatasources = async () => ky.get("/api/datasources").json();

export const getMessagesByChatbotId = async (chatbotId) =>
  ky.get(`/api/chatbots/${chatbotId}/messages`).json();

export const getPromptVariables = (string) => {
  let variables = [];
  let regex = /{{(.*?)}}/g;
  let match;

  while ((match = regex.exec(string))) {
    variables.push(match[1].trim());
  }

  return variables;
};

export const getPrompTemplates = async () =>
  ky.get("/api/prompt-templates").json();

export const removePromptTemplateById = async (id) =>
  ky.delete(`/api/prompt-templates/${id}`).json();

export const removeChatbotById = async (id) =>
  ky.delete(`/api/chatbots/${id}`).json();

export const removeDatasourceById = async (id) =>
  ky.delete(`/api/datasources/${id}`).json();

export const sendChatMessage = async ({ id, message, history }) =>
  ky
    .post(`/api/v1/chatbots/${id}`, {
      json: { message, history },
      timeout: 60000,
    })
    .json();

export const updateChatbotById = async (id, data) =>
  ky
    .patch(`/api/chatbots/${id}`, {
      json: { ...data },
    })
    .json();

export const getPresetGoalCategories = async () =>
  ky.get("/api/preset-goals?action=categories").json();

export const getPresetGoalsByCategory = async (category) =>
  ky.get(`/api/preset-goals?action=byCategory&category=${category}`).json();

export const getAllPresetGoals = async () =>
  ky.get("/api/preset-goals?action=all").json();

export const searchPresetGoals = async (query) =>
  ky.get(`/api/preset-goals?action=search&search=${encodeURIComponent(query)}`).json();

export const suggestGoalTimeline = async (subject, targetDate, category, level) =>
  ky.get(`/api/preset-goals?action=suggestTimeline&subject=${encodeURIComponent(subject || '')}&targetDate=${targetDate || ''}&category=${category || ''}&level=${level || 'intermediate'}`).json();

export const generateSmartGoalBreakdown = async (goalTitle, targetDate) =>
  ky.post("/api/preset-goals?action=generateFromGoal", {
    json: { goalTitle, targetDate },
    timeout: 60000
  }).json();

export const getConversations = async () =>
  ky.get("/api/social?type=conversations").json();

export const getDirectMessages = async (partnerId) =>
  ky.get(`/api/social?type=messages&partnerId=${partnerId}`).json();

export const sendDirectMessage = async (partnerId, content, messageType = 'text', fileData = null, fileName = null, fileType = null) =>
  ky.post("/api/social?type=messages", {
    json: { partnerId, content, messageType, fileData, fileName, fileType },
    timeout: 60000
  }).json();

export const getSocialFiles = async () =>
  ky.get("/api/social?type=files").json();

export const deleteSocialFile = async (fileId) =>
  ky.delete("/api/social?type=files", {
    json: { fileId }
  }).json();

export const getAiMessageSuggestion = async (partnerName, lastMessage, context) =>
  ky.post("/api/social?type=ai-suggestion", {
    json: { partnerName, lastMessage, context }
  }).json();
