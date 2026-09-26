function calculateOverallRisk(
    urlAnalysis,
    paymentAnalysis,
    tampering,
    referenceComparison
) {

    let score = 0;
    let reasons = [];

    // -----------------------------
    // 1. URL ANALYSIS
    // -----------------------------
    if (urlAnalysis) {

        score = Math.max(
            score,
            urlAnalysis.riskScore || 0
        );

        if (urlAnalysis.reasons) {
            reasons.push(
                ...urlAnalysis.reasons
            );
        }
    }


    // -----------------------------
    // 2. PAYMENT ANALYSIS
    // -----------------------------
    if (paymentAnalysis) {

        score = Math.max(
            score,
            paymentAnalysis.riskScore || 0
        );

        if (paymentAnalysis.reasons) {
            reasons.push(
                ...paymentAnalysis.reasons
            );
        }
    }


    // -----------------------------
    // 3. VISUAL TAMPERING ANALYSIS
    // -----------------------------
    if (
        tampering &&
        tampering.success
    ) {

        score = Math.max(
            score,
            tampering.tamperScore || 0
        );

        if (tampering.indicators) {
            reasons.push(
                ...tampering.indicators
            );
        }
    }


    // -----------------------------
    // 4. TRUSTED QR COMPARISON
    // -----------------------------
    if (
        referenceComparison &&
        referenceComparison.success
    ) {

        if (
            referenceComparison.status ===
            "POSSIBLE OVERLAY"
        ) {

            score = Math.max(
                score,
                60
            );

            reasons.push(
                "Scanned QR differs significantly from the trusted reference QR"
            );
        }


        else if (
            referenceComparison.status ===
            "SUSPICIOUS"
        ) {

            score = Math.max(
                score,
                30
            );

            reasons.push(
                "Scanned QR differs from the trusted reference QR"
            );
        }
    }


    // -----------------------------
    // LIMIT SCORE
    // -----------------------------
    score = Math.round(
        Math.min(
            Math.max(score, 0),
            100
        )
    );


    // -----------------------------
    // RISK LEVEL
    // -----------------------------
    let level;

    if (score >= 60) {

        level = "HIGH RISK";

    } else if (score >= 30) {

        level = "SUSPICIOUS";

    } else {

        level = "SAFE";
    }


    return {
        score,
        level,
        reasons
    };
}


module.exports = {
    calculateOverallRisk
};