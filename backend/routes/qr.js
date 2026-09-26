const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const jsQR = require("jsqr");
const { execFile } = require("child_process");
const path = require("path");
const fs = require("fs");
const { promisify } = require("util");

const {
    classifyPayload
} = require("../services/payloadAnalyzer");

const {
    analyzeURL
} = require("../services/urlAnalyzer");

const {
    calculateOverallRisk
} = require("../services/riskEngine");

const {
    analyzeDomain
} = require("../services/domainAnalyzer");

const {
    analyzePayment
} = require("../services/paymentAnalyzer");

const {
    compareTrustedQR
} = require("../services/trustedQR");

const Scan = require("../models/Scan");

const router = express.Router();


// --------------------------------
// Multer configuration
// --------------------------------

const upload = multer({
    storage: multer.memoryStorage()
});


// --------------------------------
// Promisify execFile
// --------------------------------

const execFileAsync = promisify(execFile);


// --------------------------------
// POST /api/qr/analyze
// --------------------------------

router.post(
    "/analyze",
    upload.single("qrImage"),

    async (req, res) => {

        let imagePath = null;

        try {

            // --------------------------------
            // 1. Check uploaded image
            // --------------------------------

            if (!req.file) {

                return res.status(400).json({
                    success: false,
                    message: "No QR image uploaded"
                });

            }


            // --------------------------------
            // 2. Decode QR
            // --------------------------------

            const {
                data,
                info
            } = await sharp(req.file.buffer)
                .ensureAlpha()
                .raw()
                .toBuffer({
                    resolveWithObject: true
                });


            const imageData =
                new Uint8ClampedArray(data);


            const qrCode = jsQR(
                imageData,
                info.width,
                info.height
            );


            if (!qrCode) {

                return res.status(400).json({
                    success: false,
                    message:
                        "No QR code detected in the image"
                });

            }


            // --------------------------------
            // 3. Classify payload
            // --------------------------------

            const payloadType =
                classifyPayload(qrCode.data);


            let urlAnalysis = null;
            let domainAnalysis = null;
            let paymentAnalysis = null;


            // --------------------------------
            // 4. URL analysis
            // --------------------------------

            if (payloadType === "URL") {

                urlAnalysis =
                    analyzeURL(qrCode.data);


                domainAnalysis =
                    await analyzeDomain(
                        qrCode.data
                    );

            }


            // --------------------------------
            // 5. Payment analysis
            // --------------------------------

            if (payloadType === "PAYMENT") {

                paymentAnalysis =
                    analyzePayment(
                        qrCode.data
                    );

            }


            // --------------------------------
            // 6. Save uploaded image temporarily
            // --------------------------------

            imagePath = path.resolve(
                __dirname,
                "../../temp_qr_image.jpg"
            );


            fs.writeFileSync(
                imagePath,
                req.file.buffer
            );


            // --------------------------------
            // 7. Python paths
            // --------------------------------

            const tamperScript =
                path.resolve(
                    __dirname,
                    "../../vision/tamper_detection.py"
                );


            const compareScript =
                path.resolve(
                    __dirname,
                    "../../vision/qr_compare.py"
                );


            const referenceImage =
                path.resolve(
                    __dirname,
                    "../../reference_qr/WhatsApp Image 2026-09-23 at 11.00.32 AM.jpeg"
                );


            // --------------------------------
            // 8. Tampering analysis
            // --------------------------------

            let tamperingResult;


            try {

                const {
                    stdout
                } = await execFileAsync(
                    "py",
                    [
                        tamperScript,
                        imagePath
                    ]
                );


                tamperingResult =
                    JSON.parse(stdout);


            } catch (error) {

                console.error(
                    "Tampering analysis error:",
                    error.message
                );


                tamperingResult = {

                    success: false,

                    message:
                        "Tampering analysis failed"

                };

            }


            // --------------------------------
            // 9. Existing reference QR comparison
            // --------------------------------

            let referenceComparison;


            try {

                if (
                    !fs.existsSync(
                        referenceImage
                    )
                ) {

                    referenceComparison = {

                        success: false,

                        status:
                            "NOT AVAILABLE",

                        message:
                            "Trusted reference QR image was not found"

                    };

                } else {

                    const {
                        stdout
                    } = await execFileAsync(
                        "py",
                        [
                            compareScript,
                            referenceImage,
                            imagePath
                        ]
                    );


                    referenceComparison =
                        JSON.parse(stdout);

                }


            } catch (error) {

                console.error(
                    "Reference comparison error:",
                    error.message
                );


                referenceComparison = {

                    success: false,

                    status:
                        "ERROR",

                    message:
                        "Reference QR comparison failed"

                };

            }


            // --------------------------------
            // 10. Overall risk
            // --------------------------------

            const overallRisk =
                calculateOverallRisk(
                    urlAnalysis,
                    paymentAnalysis,
                    tamperingResult,
                    referenceComparison
                );


            // --------------------------------
            // 11. Trusted QR database comparison
            // --------------------------------

            const trustedQRComparison =
                await compareTrustedQR({

                    payload:
                        qrCode.data,

                    type:
                        payloadType,

                    paymentAnalysis:
                        paymentAnalysis,

                    urlAnalysis:
                        urlAnalysis
                });


            // --------------------------------
            // 12. Authorization status
            // --------------------------------

            let authorization;


            if (
                trustedQRComparison.status ===
                "MATCH"
            ) {

                authorization = {

                    status:
                        "AUTHORIZED",

                    qrId:
                        trustedQRComparison.qrId,

                    organization:
                        trustedQRComparison.organization,

                    location:
                        trustedQRComparison.location,

                    purpose:
                        trustedQRComparison.purpose,

                    message:
                        "This QR matches the registered QR for this context."

                };

            } else if (
                trustedQRComparison.status ===
                "POSSIBLE OVERLAY"
            ) {

                authorization = {

                    status:
                        "CONTEXT MISMATCH",

                    qrId:
                        trustedQRComparison.qrId,

                    organization:
                        trustedQRComparison.organization,

                    location:
                        trustedQRComparison.location,

                    purpose:
                        trustedQRComparison.purpose,

                    message:
                        "This QR does not match the registered QR for this context."

                };

            } else {

                authorization = {

                    status:
                        "UNVERIFIED",

                    message:
                        "This QR is not registered with OmniGuard."

                };

            }


            // --------------------------------
            // 13. Determine final OmniGuard status
            // --------------------------------

            const riskLevel =
                overallRisk?.level ||
                overallRisk?.riskLevel ||
                "";


            let finalStatus;


            if (
                riskLevel === "HIGH RISK" ||
                riskLevel === "HIGH"
            ) {

                finalStatus =
                    "HIGH RISK";

            } else if (
                authorization.status ===
                "CONTEXT MISMATCH"
            ) {

                finalStatus =
                    "CONTEXT MISMATCH";

            } else if (
                authorization.status ===
                "AUTHORIZED"
            ) {

                finalStatus =
                    "AUTHORIZED";

            } else {

                finalStatus =
                    "UNVERIFIED";

            }


            // --------------------------------
            // 14. Save scan to MongoDB
            // --------------------------------

            try {

                const savedScan =
                    await Scan.create({

                        payload:
                            qrCode.data,

                        type:
                            payloadType,

                        urlAnalysis:
                            urlAnalysis,

                        domainAnalysis:
                            domainAnalysis,

                        paymentAnalysis:
                            paymentAnalysis,

                        tampering:
                            tamperingResult,

                        referenceComparison:
                            referenceComparison,

                        authorization:
                            authorization,

                        finalStatus:
                            finalStatus,

                        overallRisk:
                            overallRisk

                    });


                console.log(
                    "Scan saved to MongoDB:",
                    savedScan._id
                );


            } catch (databaseError) {

                console.error(
                    "MongoDB save error:",
                    databaseError.message
                );


                return res.status(500).json({

                    success: false,

                    message:
                        "QR analyzed but could not be saved to MongoDB",

                    error:
                        databaseError.message

                });

            }


            // --------------------------------
            // 15. Delete temporary image
            // --------------------------------

            try {

                if (
                    imagePath &&
                    fs.existsSync(
                        imagePath
                    )
                ) {

                    fs.unlinkSync(
                        imagePath
                    );

                }


            } catch (deleteError) {

                console.error(
                    "Temporary file cleanup error:",
                    deleteError.message
                );

            }


            // --------------------------------
            // 16. Final response
            // --------------------------------

            return res.json({

                success: true,

                message:
                    "QR code analyzed successfully",

                payload:
                    qrCode.data,

                type:
                    payloadType,

                urlAnalysis:
                    urlAnalysis,

                domainAnalysis:
                    domainAnalysis,

                paymentAnalysis:
                    paymentAnalysis,

                tampering:
                    tamperingResult,

                referenceComparison:
                    referenceComparison,

                trustedQRComparison:
                    trustedQRComparison,

                authorization:
                    authorization,

                finalStatus:
                    finalStatus,

                overallRisk:
                    overallRisk,

                location:
                    qrCode.location

            });


        } catch (error) {

            console.error(
                "QR analysis error:",
                error
            );


            // --------------------------------
            // Cleanup if something fails
            // --------------------------------

            try {

                if (
                    imagePath &&
                    fs.existsSync(
                        imagePath
                    )
                ) {

                    fs.unlinkSync(
                        imagePath
                    );

                }

            } catch (cleanupError) {

                console.error(
                    "Cleanup error:",
                    cleanupError.message
                );

            }


            return res.status(500).json({

                success: false,

                message:
                    "Failed to analyze QR image",

                error:
                    error.message

            });

        }

    }
);


module.exports = router;