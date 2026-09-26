function classifyPayload(payload) {

    if (!payload || typeof payload !== "string") {
        return "UNKNOWN";
    }

    const data = payload.trim();

    // Web URL
    if (/^https?:\/\//i.test(data)) {
        return "URL";
    }

    // UPI payment
    if (/^upi:\/\//i.test(data)) {
        return "PAYMENT";
    }

    // Wi-Fi configuration
    if (/^WIFI:/i.test(data)) {
        return "WIFI";
    }

    // SMS
    if (/^SMSTO:/i.test(data) || /^SMS:/i.test(data)) {
        return "SMS";
    }

    // Email
    if (/^mailto:/i.test(data)) {
        return "EMAIL";
    }

    // Phone
    if (/^tel:/i.test(data)) {
        return "PHONE";
    }

    // Other deep links
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(data)) {
        return "DEEP_LINK";
    }

    return "TEXT";
}

module.exports = {
    classifyPayload
};