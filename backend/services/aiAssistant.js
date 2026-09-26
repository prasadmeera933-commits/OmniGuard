const { GoogleGenAI } = require("@google/genai");

async function askSecurityAssistant(question, scanResult) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing");
    }

    const ai = new GoogleGenAI({
        apiKey: apiKey
    });

    const prompt = `
You are OmniGuard AI, a QR security assistant.

Explain QR security analysis clearly and simply.

Rules:
- Use the supplied scan results as the source of truth.
- Do not invent security findings.
- Do not claim that a QR is absolutely safe or malicious.
- Explain technical terms simply.
- If the risk is HIGH RISK, advise the user not to proceed.
- Keep the answer concise.

QR SECURITY ANALYSIS:
${JSON.stringify(scanResult || {}, null, 2)}

USER QUESTION:
${question}
`;

    console.log("Sending request to Gemini...");
    console.log("Question:", question);
    console.log("Scan result:", scanResult);

    const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt
    });

    console.log("Gemini response received");

    if (!response || !response.text) {
        throw new Error("Gemini returned an empty response");
    }

    return response.text;
}

module.exports = {
    askSecurityAssistant
};