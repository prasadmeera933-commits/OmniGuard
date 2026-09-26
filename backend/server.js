const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const qrRoutes = require("./routes/qr");
const aiRoutes = require("./routes/ai");

const app = express();

app.use(cors());
app.use(express.json());

// Check environment variables
console.log("GEMINI_API_KEY loaded:", !!process.env.GEMINI_API_KEY);
console.log("MONGO_URI loaded:", !!process.env.MONGO_URI);

// MongoDB connection
mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("MongoDB connected successfully");
    })
    .catch((error) => {
        console.error(
            "MongoDB connection error:",
            error.message
        );
    });

// Routes
app.use("/api/qr", qrRoutes);
app.use("/api/ai", aiRoutes);

// Home route
app.get("/", (req, res) => {
    res.json({
        message: "OmniGuard QR Backend is running"
    });
});

// AI test route
app.get("/api/ai/test", (req, res) => {
    res.json({
        success: true,
        message: "AI route is reachable",
        geminiKeyLoaded: !!process.env.GEMINI_API_KEY
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(
        `OmniGuard QR server running on port ${PORT}`
    );
});