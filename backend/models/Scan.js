const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema(
    {
        // QR payload
        payload: {
            type: String,
            required: true
        },

        // Payload type
        type: {
            type: String,
            required: true
        },

        // URL analysis
        urlAnalysis: {
            type: Object,
            default: null
        },

        // Domain analysis
        domainAnalysis: {
            type: Object,
            default: null
        },

        // Payment analysis
        paymentAnalysis: {
            type: Object,
            default: null
        },

        // Visual tampering analysis
        tampering: {
            type: Object,
            default: null
        },

        // Trusted QR comparison
        referenceComparison: {
            type: Object,
            default: null
        },

        // Final risk assessment
        overallRisk: {
            type: Object,
            default: null
        }
    },

    {
        timestamps: true
    }
);


module.exports = mongoose.model(
    "Scan",
    scanSchema
);