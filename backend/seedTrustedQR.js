require("dotenv").config();

const mongoose = require("mongoose");

const TrustedQR = require("./models/TrustedQR");

async function seedTrustedQR() {
    try {
        if (!process.env.MONGO_URI) {
            throw new Error(
                "MONGO_URI is not loaded from .env"
            );
        }

        await mongoose.connect(
            process.env.MONGO_URI
        );

        console.log(
            "MongoDB connected successfully"
        );

        /*
         * Remove previous demo QR.
         */
        await TrustedQR.deleteMany({});

        /*
         * Create official registered QR.
         *
         * IMPORTANT:
         * This payload must be the SAME payload
         * contained in the QR you want to demonstrate
         * as the official QR.
         */
        const trustedQR = await TrustedQR.create({

    qrId: "DEMO-BANK-001",

    organization:
        "OmniGuard Demo Bank",

    location:
        "Main Payment Counter",

    purpose:
        "Demo Payment",

    payload:
        "upi://pay?pa=femina0444@okaxis&pn=Femina&aid=uGICAgKDMvYWbPw",

    payeeAddress:
        "femina0444@okaxis",

    payeeName:
        "Femina",

    status:
        "ACTIVE"
});

        console.log(
            "\nTrusted QR registered successfully:"
        );

        console.log(
            JSON.stringify(
                trustedQR,
                null,
                2
            )
        );

        await mongoose.disconnect();

        console.log(
            "\nMongoDB connection closed."
        );

        process.exit(0);

    } catch (error) {
        console.error(
            "\nTrusted QR seed error:"
        );

        console.error(error.message);

        process.exit(1);
    }
}

seedTrustedQR();