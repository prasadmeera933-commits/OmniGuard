const mongoose = require("mongoose");

const trustedQRSchema = new mongoose.Schema(
    {
        qrId: {
            type: String,
            required: true,
            unique: true,
            trim: true
        },

        organization: {
            type: String,
            required: true,
            trim: true
        },

        location: {
            type: String,
            required: true,
            trim: true
        },

        purpose: {
            type: String,
            required: true,
            trim: true
        },

        payload: {
            type: String,
            required: true,
            trim: true
        },

        payeeAddress: {
            type: String,
            default: null
        },

        payeeName: {
            type: String,
            default: null
        },

        status: {
            type: String,
            enum: [
                "ACTIVE",
                "COMPROMISED",
                "REVOKED"
            ],
            default: "ACTIVE"
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "TrustedQR",
    trustedQRSchema
);