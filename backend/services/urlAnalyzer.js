function analyzeURL(url) {
    const reasons = [];
    let riskScore = 0;

    try {
        const parsedURL = new URL(url);

        const hostname = parsedURL.hostname.toLowerCase();
        const fullURL = url.toLowerCase();

        // 1. HTTPS check
        if (parsedURL.protocol !== "https:") {
            riskScore += 15;
            reasons.push("URL does not use HTTPS");
        }

        // 2. IP address check
        const ipAddressPattern =
            /^(?:\d{1,3}\.){3}\d{1,3}$/;

        if (ipAddressPattern.test(hostname)) {
            riskScore += 25;
            reasons.push("URL uses an IP address instead of a domain name");
        }

        // 3. @ symbol
        if (url.includes("@")) {
            riskScore += 20;
            reasons.push("URL contains an @ symbol");
        }

        // 4. Excessive subdomains
        const subdomainCount = hostname.split(".").length - 2;

        if (subdomainCount >= 3) {
            riskScore += 15;
            reasons.push("URL contains many subdomains");
        }

        // 5. Very long URL
        if (url.length > 150) {
            riskScore += 10;
            reasons.push("URL is unusually long");
        }

        // 6. Suspicious keywords
        const suspiciousKeywords = [
            "login",
            "verify",
            "verification",
            "secure",
            "account",
            "update",
            "confirm",
            "password",
            "bank",
            "payment"
        ];

        const detectedKeywords = suspiciousKeywords.filter(
            keyword => fullURL.includes(keyword)
        );

        if (detectedKeywords.length > 0) {
            riskScore += Math.min(detectedKeywords.length * 5, 20);

            reasons.push(
                `Security-sensitive keywords detected: ${detectedKeywords.join(", ")}`
            );
        }

        // 7. URL shortener detection
        const shortenerDomains = [
            "bit.ly",
            "tinyurl.com",
            "t.co",
            "is.gd",
            "cutt.ly",
            "shorturl.at"
        ];

        if (shortenerDomains.includes(hostname)) {
            riskScore += 15;
            reasons.push("URL uses a known URL shortening service");
        }

        // 8. Suspicious port
        const suspiciousPorts = ["21", "22", "23", "25", "445", "3389"];

        if (
            parsedURL.port &&
            suspiciousPorts.includes(parsedURL.port)
        ) {
            riskScore += 15;
            reasons.push(
                `URL uses a potentially sensitive port: ${parsedURL.port}`
            );
        }

        // 9. Punycode / internationalized domain indicator
        if (hostname.includes("xn--")) {
            riskScore += 20;
            reasons.push(
                "Domain contains Punycode and requires additional verification"
            );
        }

        // Keep score between 0 and 100
        riskScore = Math.min(Math.max(riskScore, 0), 100);

        // Determine risk level
        let riskLevel;

        if (riskScore >= 60) {
            riskLevel = "HIGH RISK";
        } else if (riskScore >= 30) {
            riskLevel = "SUSPICIOUS";
        } else {
            riskLevel = "SAFE";
        }

        return {
            riskScore,
            riskLevel,
            reasons,
            hostname,
            protocol: parsedURL.protocol
        };

    } catch (error) {

        return {
            riskScore: 80,
            riskLevel: "HIGH RISK",
            reasons: [
                "Invalid or malformed URL"
            ],
            hostname: null,
            protocol: null
        };
    }
}

module.exports = {
    analyzeURL
};