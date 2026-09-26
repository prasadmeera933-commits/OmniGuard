const express = require("express");

const {
    askSecurityAssistant
} = require("../services/aiAssistant");

const router = express.Router();

router.post("/chat", async (req, res) => {
    try {
        const { question, scanResult } = req.body;

        console.log("========== AI CHAT ==========");
        console.log("Question:", question);
        console.log("Scan Result:", scanResult);

        if (!question || !question.trim()) {
            return res.status(400).json({
                success: false,
                message: "Question is required"
            });
        }

        const answer = await askSecurityAssistant(
            question,
            scanResult || {}
        );

        console.log("AI RESPONSE SUCCESS");

        return res.json({
            success: true,
            answer: answer
        });

    } catch (error) {

        console.error("========== AI ERROR ==========");
        console.error(error);
        console.error("ERROR MESSAGE:", error.message);
        console.error("ERROR STACK:", error.stack);
        console.error("==============================");

        return res.status(500).json({
            success: false,
            message: "AI assistant failed",
            error: error.message || String(error)
        });
    }
});

module.exports = router;