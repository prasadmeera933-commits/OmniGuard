const dns = require("dns").promises;

async function analyzeDomain(url) {
    try {
        const parsedURL = new URL(url);
        const hostname = parsedURL.hostname;

        // DNS lookup
        const addresses = await dns.lookup(hostname, {
            all: true
        });

        const ipv4 = addresses
            .filter(item => item.family === 4)
            .map(item => item.address);

        const ipv6 = addresses
            .filter(item => item.family === 6)
            .map(item => item.address);

        return {
            success: true,
            hostname,
            ipv4,
            ipv6,
            resolved: true
        };

    } catch (error) {

        return {
            success: false,
            hostname: null,
            ipv4: [],
            ipv6: [],
            resolved: false,
            error: error.message
        };
    }
}

module.exports = {
    analyzeDomain
};