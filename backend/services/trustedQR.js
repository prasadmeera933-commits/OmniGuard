const TrustedQR = require("../models/TrustedQR");

async function compareTrustedQR(scanResult) {
    try {
        const scannedPayload = scanResult?.payload;

        // No payload means we cannot compare
        if (!scannedPayload) {
            return {
                status: "UNVERIFIED",
                differencePercentage: 100,
                message:
                    "No QR payload was decoded, so organizational authenticity could not be verified."
            };
        }

        /*
         * Look for an exact registered QR match.
         */
        const exactMatch = await TrustedQR.findOne({
            payload: scannedPayload,
            status: "ACTIVE"
        }).lean();

        if (exactMatch) {
            return {
                status: "MATCH",
                differencePercentage: 0,

                qrId: exactMatch.qrId,
                organization: exactMatch.organization,
                location: exactMatch.location,
                purpose: exactMatch.purpose,

                payeeAddress:
                    exactMatch.payeeAddress,

                payeeName:
                    exactMatch.payeeName,

                message:
                    `This QR matches the registered QR for ${exactMatch.organization} at ${exactMatch.location}.`
            };
        }

        /*
         * No exact match.
         *
         * For the hackathon demo we check whether there
         * is an active trusted QR in the registry.
         *
         * If one exists, the scanned QR is treated as a
         * possible replacement/context mismatch.
         */
        const trustedQR = await TrustedQR.findOne({
            status: "ACTIVE"
        }).lean();

        if (trustedQR) {
            return {
                status: "POSSIBLE OVERLAY",
                differencePercentage: 100,

                qrId: trustedQR.qrId,
                organization:
                    trustedQR.organization,
                location:
                    trustedQR.location,
                purpose:
                    trustedQR.purpose,

                expectedPayload:
                    trustedQR.payload,

                expectedPayeeAddress:
                    trustedQR.payeeAddress,

                expectedPayeeName:
                    trustedQR.payeeName,

                message:
                    `The scanned QR does not match the registered QR for ${trustedQR.organization} at ${trustedQR.location}.`
            };
        }

        /*
         * Registry contains no active QR.
         */
        return {
            status: "UNVERIFIED",
            differencePercentage: 100,
            message:
                "This QR is not registered with OmniGuard. Security analysis was performed, but organizational authenticity could not be verified."
        };

    } catch (error) {
        console.error(
            "Trusted QR comparison error:",
            error.message
        );

        return {
            status: "UNVERIFIED",
            differencePercentage: 100,
            message:
                "Trusted QR comparison could not be completed."
        };
    }
}

module.exports = {
    compareTrustedQR
};