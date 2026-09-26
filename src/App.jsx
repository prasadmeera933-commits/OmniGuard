import { useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/qr/analyze";

function App() {
    const videoRef = useRef(null);
const streamRef = useRef(null);

const [cameraOpen, setCameraOpen] = useState(false);
const [cameraError, setCameraError] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [showJson, setShowJson] = useState(false);
    const [aiAnswer, setAiAnswer] = useState("");
const [aiLoading, setAiLoading] = useState(false);
const [aiQuestion, setAiQuestion] = useState("");
const [aiMessages, setAiMessages] = useState([]);
const startCamera = async () => {
    setCameraError("");

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: {
                    ideal: "environment"
                }
            },
            audio: false
        });

        streamRef.current = stream;
        setCameraOpen(true);

    } catch (error) {
        console.error("Camera error:", error);

        setCameraError(
            "Camera access was denied or is not available."
        );
    }
};

const stopCamera = () => {

    if (streamRef.current) {

        streamRef.current
            .getTracks()
            .forEach(track => track.stop());

        streamRef.current = null;
    }

    setCameraOpen(false);
};
const captureCameraImage = async () => {
    if (!videoRef.current) return;

    const video = videoRef.current;

    if (video.readyState < 2) {
        setCameraError("Camera is not ready yet.");
        return;
    }

    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext("2d");

    context.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    canvas.toBlob(async (blob) => {

        if (!blob) {
            setCameraError("Unable to capture camera image.");
            return;
        }

        const capturedFile = new File(
            [blob],
            "camera-qr.jpg",
            {
                type: "image/jpeg"
            }
        );

        setSelectedFile(capturedFile);

        setPreview(
            URL.createObjectURL(blob)
        );

        stopCamera();

        setError("");
        setLoading(true);
        setResult(null);

        try {

            const formData = new FormData();

            formData.append(
                "qrImage",
                capturedFile
            );

            const response = await fetch(
                API_URL,
                {
                    method: "POST",
                    body: formData
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                    "QR analysis failed"
                );
            }

            setResult(data);

        } catch (err) {

            setError(err.message);

        } finally {

            setLoading(false);

        }

    }, "image/jpeg", 0.95);
};

useEffect(() => {

    if (
        cameraOpen &&
        videoRef.current &&
        streamRef.current
    ) {
        videoRef.current.srcObject =
            streamRef.current;
    }

}, [cameraOpen]);

useEffect(() => {

    return () => {

        if (streamRef.current) {

            streamRef.current
                .getTracks()
                .forEach(track => track.stop());

        }

    };

}, []);
    const handleFileChange = (event) => {
        const file = event.target.files[0];

        if (!file) return;

        setSelectedFile(file);
        setResult(null);
        setError("");

        const imageUrl = URL.createObjectURL(file);
        setPreview(imageUrl);
    };

    const analyzeQR = async () => {
        if (!selectedFile) {
            setError("Please upload a QR image first.");
            return;
        }

        setLoading(true);
        setError("");
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("qrImage", selectedFile);

            const response = await fetch(API_URL, {
                method: "POST",
                body: formData
            });

           const data = await response.json();

if (!response.ok) {
    throw new Error(
        data.message || "QR analysis failed"
    );
}

setResult(data);

// Send the REAL QR analysis result to Gemini
setAiLoading(true);
setAiAnswer("");

try {

    const aiResponse = await fetch(
        "http://localhost:5000/api/ai/chat",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                question:
                    "Analyze this QR scan and explain the security result to the user.",
                scanResult: data
            })
        }
    );

    const aiData = await aiResponse.json();

    if (!aiResponse.ok) {
        throw new Error(
            aiData.message ||
            "AI explanation failed"
        );
    }

    setAiAnswer(aiData.answer);

} catch (aiError) {

    console.error(
        "AI explanation error:",
        aiError
    );

    if (
        aiError.message &&
        aiError.message.includes("quota")
    ) {

        setAiAnswer(
            "⚠️ Gemini API quota has been exceeded. Please wait for the quota to reset."
        );

    } else {

        setAiAnswer(
            `⚠️ AI explanation failed: ${aiError.message}`
        );

    }

} finally {

    setAiLoading(false);

}

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };
const askAI = async () => {
    if (!aiQuestion.trim() || !result || aiLoading) {
        return;
    }

    const question = aiQuestion.trim();

    setAiQuestion("");

    setAiMessages(prev => [
        ...prev,
        {
            role: "user",
            text: question
        }
    ]);

    setAiLoading(true);

    try {
        console.log("Sending AI request...");
        console.log("Question:", question);
        console.log("Scan result:", result);

        const response = await fetch(
            "http://localhost:5000/api/ai/chat",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question,
                    scanResult: result
                })
            }
        );

        console.log("AI HTTP status:", response.status);

        const data = await response.json();

        console.log("AI response:", data);

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.message ||
                `AI request failed (${response.status})`
            );
        }

        if (!data.success) {
            throw new Error(
                data.error ||
                data.message ||
                "AI assistant failed"
            );
        }

        if (!data.answer) {
            throw new Error("AI returned an empty answer");
        }

        setAiMessages(prev => [
            ...prev,
            {
                role: "ai",
                text: data.answer
            }
        ]);

    } catch (error) {

        console.error("AI chat error:", error);

        setAiMessages(prev => [
            ...prev,
            {
                role: "ai",
                text: `⚠️ AI Error: ${error.message}`
            }
        ]);

    } finally {
        setAiLoading(false);
    }
};
    const getRiskClass = (level) => {
        if (level === "HIGH RISK") return "high";
        if (level === "SUSPICIOUS") return "medium";
        return "safe";
    };

    const getRiskIcon = (level) => {
        if (level === "HIGH RISK") return "⚠";
        if (level === "SUSPICIOUS") return "!";
        return "✓";
    };

    return (
        <div className="app">

            {/* SIDEBAR */}

            <aside className="sidebar">

                <div className="brand">
                    <div className="brand-icon">🛡</div>

                    <div>
                        <h1>OmniGuard</h1>
                        <span>QR SECURITY</span>
                    </div>
                </div>

                <div className="sidebar-section">

                    <p>OPERATIONS CONSOLE</p>

                    <div className="nav-item active">
                        <span>◉</span>
                        Live Scanner
                    </div>

                    <div className="nav-item">
                        <span>▣</span>
                        Reference Reports
                    </div>

                    <div className="nav-item">
                        <span>⌁</span>
                        Payload Analysis
                    </div>

                    <div className="nav-item">
                        <span>◇</span>
                        Tamper Telemetry
                    </div>

                    <div className="nav-item">
                        <span>◉</span>
                        Incident Timeline
                    </div>

                    <div className="nav-item">
                        <span>⌘</span>
                        API Docs
                    </div>

                </div>

                <div className="sidebar-bottom">

                    <div className="system-status">
                        <span className="status-dot"></span>
                        SYSTEM ONLINE
                    </div>

                    <div className="zero-trust">
                        ZERO-TRUST<br />
                        <strong>ENFORCED</strong>
                    </div>

                </div>

            </aside>

            {/* MAIN CONTENT */}

            <main className="main">

                <header className="topbar">

                    <div>
                        <h2>QR Threat Scanner</h2>

                        <p>
                            Detect • Analyze • Explain • Decide
                        </p>
                    </div>

                    <div className="top-status">
                        <span className="green-dot"></span>
                        LIVE SCANNER
                    </div>

                </header>


                {/* SCANNER */}

                <section className="scanner-panel">

                    <div className="scanner-tabs">

                       <button
    className={`tab ${cameraOpen ? "active-tab" : ""}`}
    onClick={cameraOpen ? stopCamera : startCamera}
>
    ◉ {cameraOpen ? "Close Camera" : "Camera Scan"}
</button>
                        <label className="tab upload-tab">

                            ↑ Upload Image

                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleFileChange}
                                hidden
                            />

                        </label>

                        <button className="tab active-tab">
                            Paste URL / Raw String
                        </button>

                    </div>

{cameraOpen && (
    <div className="camera-panel">

        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-preview"
        />

       <div className="camera-overlay">

    <div className="scan-frame"></div>

    <p>
        Point your camera at a QR code
    </p>

    <button
        className="capture-button"
        onClick={captureCameraImage}
    >
        📷 Capture & Analyze
    </button>

</div>

    </div>
)}

{cameraError && (
    <div className="camera-error">
        ⚠ {cameraError}
    </div>
)}
                    <div className="scan-controls">

                        <div className="file-name">

                            {selectedFile ? (
                                <>
                                    <span className="green-dot"></span>

                                    {selectedFile.name}
                                </>
                            ) : (
                                <>
                                    <span>▣</span>
                                    No QR image selected
                                </>
                            )}

                        </div>


                        <button
                            className="analyze-button"
                            onClick={analyzeQR}
                            disabled={loading}
                        >

                            {loading
                                ? "ANALYZING..."
                                : "⌕ ANALYZE QR"}

                        </button>

                    </div>

                </section>


                {/* ERROR */}

                {error && (
                    <div className="error-box">
                        ⚠ {error}
                    </div>
                )}


                {/* INITIAL SCREEN */}

                {!result && !loading && (

                    <section className="welcome-panel">

                        <div className="shield-large">
                            🛡
                        </div>

                        <h2>
                            Zero-Trust QR Security
                        </h2>

                        <p>
                            Upload a QR image to decode its payload,
                            inspect the content, compare it with the
                            trusted reference QR, and calculate a
                            security risk score.
                        </p>


                        {preview && (

                            <div className="preview-container">

                                <img
                                    src={preview}
                                    alt="QR preview"
                                />

                                <p>
                                    Image ready for analysis
                                </p>

                            </div>

                        )}

                    </section>

                )}


                {/* LOADING */}

                {loading && (

                    <section className="loading-panel">

                        <div className="loader"></div>

                        <h2>
                            Analyzing QR...
                        </h2>

                        <p>
                            Decoding payload → analyzing security
                            → comparing trusted reference
                        </p>

                    </section>

                )}


                {/* RESULTS */}

                {result && !loading && (

                    <>

                        {/* RISK BANNER */}

                        <section
                            className={`risk-banner ${getRiskClass(
                                result.overallRisk?.level
                            )}`}
                        >

                            <div className="risk-score">

                                <div className="score-circle">

                                    <strong>
                                        {result.overallRisk?.score ?? 0}
                                    </strong>

                                    <span>/100</span>

                                </div>

                            </div>


                            <div className="risk-main">

                                <span className="risk-label">

                                    {getRiskIcon(
                                        result.overallRisk?.level
                                    )}{" "}

                                    {result.overallRisk?.level}

                                </span>


                                <h2>

                                    {result.referenceComparison?.status ===
                                    "POSSIBLE OVERLAY"

                                        ? "Possible QR Overlay Detected"

                                        : "QR Security Analysis Complete"}

                                </h2>


                                <p>

                                    {result.referenceComparison?.status ===
                                    "POSSIBLE OVERLAY"

                                        ? "The scanned QR differs significantly from the trusted reference QR."

                                        : "OmniGuard analyzed the QR payload and visual security indicators."}

                                </p>

                            </div>

                                                </section>


                        {/* ==========================================
                            QR AUTHORIZATION
                        ========================================== */}

                        <section className="card authorization-card">

                            <div className="card-header">

                                <div>

                                    <span className="card-icon">
                                        ✓
                                    </span>

                                    <h3>
                                        QR Authorization
                                    </h3>

                                </div>

                                <span className="card-tag">
                                    TRUST
                                </span>

                            </div>


                            {/* AUTHORIZATION STATUS */}

                            <div
                                className={`authorization-status ${
                                    result.authorization?.status
                                        ?.toLowerCase()
                                        .replace(/\s+/g, "-") ||
                                    "unverified"
                                }`}
                            >

                                <strong>

                                    {result.finalStatus ||
                                        result.authorization?.status ||
                                        "UNVERIFIED"}

                                </strong>

                            </div>


                            {/* MESSAGE */}

                            <div className="authorization-message">

                                <p>

                                    {result.authorization?.message ||
                                        "Organizational authenticity could not be verified."}

                                </p>

                            </div>


                            {/* ORGANIZATION */}

                            {result.authorization?.organization && (

                                <div className="metric-row">

                                    <span>
                                        Organization
                                    </span>

                                    <strong>
                                        {
                                            result.authorization
                                                .organization
                                        }
                                    </strong>

                                </div>

                            )}


                            {/* LOCATION */}

                            {result.authorization?.location && (

                                <div className="metric-row">

                                    <span>
                                        Location
                                    </span>

                                    <strong>
                                        {
                                            result.authorization
                                                .location
                                        }
                                    </strong>

                                </div>

                            )}


                            {/* PURPOSE */}

                            {result.authorization?.purpose && (

                                <div className="metric-row">

                                    <span>
                                        Purpose
                                    </span>

                                    <strong>
                                        {
                                            result.authorization
                                                .purpose
                                        }
                                    </strong>

                                </div>

                            )}


                            {/* REGISTERED QR ID */}

                            {result.authorization?.qrId && (

                                <div className="metric-row">

                                    <span>
                                        Registered QR ID
                                    </span>

                                    <strong>
                                        {
                                            result.authorization
                                                .qrId
                                        }
                                    </strong>

                                </div>

                            )}


                            {/* TRUSTED QR DETAILS */}

                            {result.trustedQRComparison && (

                                <div className="explanation">

                                    <h4>
                                        Registration Check
                                    </h4>

                                    <p>

                                        {result.trustedQRComparison
                                            ?.message ||
                                            "Trusted QR registry comparison completed."}

                                    </p>

                                </div>

                            )}

                        </section>


                        {/* THREE ANALYSIS CARDS */}

                        <section className="dashboard-grid">


                            {/* VISUAL ANALYSIS */}

                            <div className="card">

                                <div className="card-header">

                                    <div>

                                        <span className="card-icon">
                                            ◈
                                        </span>

                                        <h3>
                                            Visual QR Analysis
                                        </h3>

                                    </div>

                                    <span className="card-tag">
                                        OPENCV
                                    </span>

                                </div>


                                <div className="qr-preview">

                                    {preview ? (

                                        <img
                                            src={preview}
                                            alt="Scanned QR"
                                        />

                                    ) : (

                                        <div>
                                            QR IMAGE
                                        </div>

                                    )}

                                </div>


                                <div className="metric-row">

                                    <span>
                                        Physical Tamper Score
                                    </span>

                                    <strong>
                                        {result.tampering?.tamperScore ?? 0}
                                    </strong>

                                </div>


                                <div className="metric-row">

                                    <span>
                                        Edge Density
                                    </span>

                                    <strong>
                                        {result.tampering?.edgeDensity ?? "-"}
                                    </strong>

                                </div>


                                <div className="metric-row">

                                    <span>
                                        Texture Variation
                                    </span>

                                    <strong>
                                        {result.tampering?.textureVariation ?? "-"}
                                    </strong>

                                </div>

                            </div>


                            {/* REFERENCE COMPARISON */}

                            <div className="card">

                                <div className="card-header">

                                    <div>

                                        <span className="card-icon">
                                            ⛓
                                        </span>

                                        <h3>
                                            Trusted QR Comparison
                                        </h3>

                                    </div>

                                    <span className="card-tag">
                                        REFERENCE
                                    </span>

                                </div>


                                <div
                                    className={`reference-status ${
                                        result.referenceComparison?.status ===
                                        "MATCH"

                                            ? "match"

                                            : result.referenceComparison?.status ===
                                              "POSSIBLE OVERLAY"

                                            ? "danger"

                                            : "warning"
                                    }`}
                                >

                                    <strong>

                                        {result.referenceComparison?.status ||
                                            "UNKNOWN"}

                                    </strong>

                                    <span>

                                        Difference:{" "}

                                        {result.referenceComparison
                                            ?.differencePercentage ?? 0}

                                        %

                                    </span>

                                </div>


                                <div className="comparison-message">

                                    {result.referenceComparison?.message ||
                                        "Reference comparison unavailable."}

                                </div>


                                <div className="explanation">

                                    <h4>
                                        Why does this matter?
                                    </h4>

                                    <p>

                                        OmniGuard compares the scanned QR
                                        against a trusted reference to
                                        identify possible replacement or
                                        overlay attacks.

                                    </p>

                                </div>

                            </div>


                            {/* PAYLOAD */}

                            <div className="card">

                                <div className="card-header">

                                    <div>

                                        <span className="card-icon">
                                            &lt;/&gt;
                                        </span>

                                        <h3>
                                            Payload Deep Inspection
                                        </h3>

                                    </div>

                                    <span className="card-tag">
                                        {result.type}
                                    </span>

                                </div>


                                <div className="payload-box">

                                    <span>
                                        DECODED PAYLOAD
                                    </span>

                                    <code>
                                        {result.payload}
                                    </code>

                                </div>


                                <div className="metric-row">

                                    <span>
                                        Payload Type
                                    </span>

                                    <strong>
                                        {result.type}
                                    </strong>

                                </div>


                                {result.urlAnalysis && (

                                    <>

                                        <div className="metric-row">

                                            <span>
                                                Hostname
                                            </span>

                                            <strong>
                                                {
                                                    result.urlAnalysis
                                                        .hostname
                                                }
                                            </strong>

                                        </div>


                                        <div className="metric-row">

                                            <span>
                                                URL Risk
                                            </span>

                                            <strong>
                                                {
                                                    result.urlAnalysis
                                                        .riskScore
                                                }
                                                /100
                                            </strong>

                                        </div>

                                    </>

                                )}


                                {result.paymentAnalysis && (

                                    <>

                                        <div className="metric-row">

                                            <span>
                                                Payee
                                            </span>

                                            <strong>
                                                {
                                                    result.paymentAnalysis
                                                        .payeeName || "Unknown"
                                                }
                                            </strong>

                                        </div>


                                        <div className="metric-row">

                                            <span>
                                                UPI Address
                                            </span>

                                            <strong>
                                                {
                                                    result.paymentAnalysis
                                                        .payeeAddress || "Missing"
                                                }
                                            </strong>

                                        </div>

                                    </>

                                )}

                            </div>

                        </section>


                        {/* REASONS */}

                        <section className="card reasons-card">

                            <div className="card-header">

                                <div>

                                    <span className="card-icon">
                                        !
                                    </span>

                                    <h3>
                                        Why Was This QR Flagged?
                                    </h3>

                                </div>

                            </div>


                            {result.overallRisk?.reasons?.length > 0 ? (

                                <div className="reasons-list">

                                    {result.overallRisk.reasons.map(
                                        (reason, index) => (

                                            <div
                                                className="reason"
                                                key={index}
                                            >

                                                <span>
                                                    ⚠
                                                </span>

                                                <p>
                                                    {reason}
                                                </p>

                                            </div>

                                        )
                                    )}

                                </div>

                            ) : (

                                <div className="no-threat">

                                    ✓ No suspicious indicators were
                                    detected by the current analysis.

                                </div>

                            )}

                        </section>
<section className="card ai-card">

    <div className="card-header">

        <div>
            <span className="card-icon">
                🤖
            </span>

            <h3>
                OmniGuard AI Assistant
            </h3>
        </div>

        <span className="card-tag">
            GEMINI AI
        </span>

    </div>

    <div className="ai-chat">

        {aiMessages.length === 0 && aiAnswer && (
            <div className="ai-message ai-message-bot">
                <strong>🤖 OmniGuard AI</strong>
                <p>{aiAnswer}</p>
            </div>
        )}

        {aiMessages.map((message, index) => (

            <div
                key={index}
                className={
                    message.role === "user"
                        ? "ai-message ai-message-user"
                        : "ai-message ai-message-bot"
                }
            >

                <strong>
                    {message.role === "user"
                        ? "You"
                        : "🤖 OmniGuard AI"}
                </strong>

                <p>
                    {message.text}
                </p>

            </div>

        ))}

        {aiLoading && (
            <div className="ai-message ai-message-bot">
                <strong>🤖 OmniGuard AI</strong>
                <p>Thinking...</p>
            </div>
        )}

    </div>

    <div className="ai-input-row">

        <input
            type="text"
            value={aiQuestion}
            onChange={(event) =>
                setAiQuestion(event.target.value)
            }
            onKeyDown={(event) => {

                if (event.key === "Enter") {
                    askAI();
                }

            }}
            placeholder={
                result
                    ? "Ask about this QR..."
                    : "Analyze a QR first..."
            }
            disabled={!result || aiLoading}
        />

        <button
            onClick={askAI}
            disabled={
                !result ||
                aiLoading ||
                !aiQuestion.trim()
            }
        >
            Send
        </button>

    </div>

</section>

                        {/* DECISION */}

                        <section
                            className={`decision ${
                                getRiskClass(
                                    result.overallRisk?.level
                                )
                            }`}
                        >

                            <div>

                                <span className="decision-icon">

                                    {getRiskIcon(
                                        result.overallRisk?.level
                                    )}

                                </span>


                                <div>

                                    <h3>

                                        {result.overallRisk?.level ===
                                        "HIGH RISK"

                                            ? "DO NOT PROCEED"

                                            : result.overallRisk?.level ===
                                              "SUSPICIOUS"

                                            ? "PROCEED WITH CAUTION"

                                            : "NO HIGH-RISK INDICATORS DETECTED"}

                                    </h3>


                                    <p>

                                        OmniGuard provides a heuristic
                                        security assessment. It does not
                                        guarantee that a destination is
                                        malicious or safe.

                                    </p>

                                </div>

                            </div>

                        </section>


                        {/* JSON */}

                        <div className="json-section">

                            <button
                                onClick={() =>
                                    setShowJson(!showJson)
                                }
                            >

                                {showJson
                                    ? "Hide Raw JSON"
                                    : "View Raw JSON"}

                            </button>


                            {showJson && (

                                <pre>

                                    {JSON.stringify(
                                        result,
                                        null,
                                        2
                                    )}

                                </pre>

                            )}

                        </div>

                    </>

                )}

            </main>

        </div>
    );
}

export default App;