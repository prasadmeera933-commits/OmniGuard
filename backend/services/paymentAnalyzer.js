function analyzePayment(payload) {

    const reasons = [];
    let riskScore = 0;

    try {

        const parsedURL = new URL(payload);

        // Check UPI scheme
        if (parsedURL.protocol !== "upi:") {

            return {
                success: false,
                message: "Not a valid UPI payment payload"
            };
        }

        // Extract UPI parameters
        const payeeAddress = parsedURL.searchParams.get("pa");
        const payeeName = parsedURL.searchParams.get("pn");
        const amount = parsedURL.searchParams.get("am");
        const currency = parsedURL.searchParams.get("cu");
        const transactionReference =
            parsedURL.searchParams.get("tr");

        // Payee address
        if (!payeeAddress) {

            riskScore += 30;

            reasons.push(
                "UPI payment address is missing"
            );

        } else {

            if (!payeeAddress.includes("@")) {

                riskScore += 25;

                reasons.push(
                    "UPI payment address appears malformed"
                );
            }
        }

        // Payee name
        if (!payeeName) {

            riskScore += 10;

            reasons.push(
                "Payee name is missing"
            );
        }

        // Amount
        if (amount) {

            const numericAmount = Number(amount);

            if (
                Number.isNaN(numericAmount) ||
                numericAmount <= 0
            ) {

                riskScore += 20;

                reasons.push(
                    "Payment amount is invalid"
                );
            }
        }

        // Currency
        if (currency && currency !== "INR") {

            riskScore += 15;

            reasons.push(
                `Unexpected currency specified: ${currency}`
            );
        }

        // Transaction reference
        if (!transactionReference) {

            reasons.push(
                "No transaction reference specified"
            );
        }

        riskScore = Math.min(
            Math.max(riskScore, 0),
            100
        );

        let riskLevel;

        if (riskScore >= 60) {

            riskLevel = "HIGH RISK";

        } else if (riskScore >= 30) {

            riskLevel = "SUSPICIOUS";

        } else {

            riskLevel = "SAFE";
        }

        return {

            success: true,

            payeeAddress,
            payeeName,
            amount,
            currency,
            transactionReference,

            riskScore,
            riskLevel,
            reasons
        };

    } catch (error) {

        return {

            success: false,

            message:
                "Unable to analyze UPI payment payload",

            error: error.message
        };
    }
}


module.exports = {
    analyzePayment
};