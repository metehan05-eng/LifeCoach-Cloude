const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
(async () => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });
    const response = await model.generateContent("hello");
    console.log("1.5-flash:", response.response.text());
  } catch (e) { console.error("1.5-flash error:", e.message); }
})();
