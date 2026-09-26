import cv2
import numpy as np
import sys
import json


def analyze_tampering(image_path):

    image = cv2.imread(image_path)

    if image is None:
        return {
            "success": False,
            "message": "Unable to read image"
        }

    # ---------------------------------------
    # Detect QR code
    # ---------------------------------------

    detector = cv2.QRCodeDetector()

    data, points, _ = detector.detectAndDecode(image)

    if points is None:
        return {
            "success": False,
            "message": "QR code region could not be detected"
        }

    points = points[0].astype(np.int32)

    # ---------------------------------------
    # Create QR mask
    # ---------------------------------------

    mask = np.zeros(
        image.shape[:2],
        dtype=np.uint8
    )

    cv2.fillPoly(
        mask,
        [points],
        255
    )

    # ---------------------------------------
    # Create boundary around QR
    # ---------------------------------------

    kernel = np.ones(
        (21, 21),
        np.uint8
    )

    expanded = cv2.dilate(
        mask,
        kernel,
        iterations=1
    )

    border = cv2.subtract(
        expanded,
        mask
    )

    border_pixels = border > 0

    if np.sum(border_pixels) == 0:
        return {
            "success": False,
            "message": "Unable to analyze QR boundary"
        }

    # ---------------------------------------
    # Convert to grayscale
    # ---------------------------------------

    gray = cv2.cvtColor(
        image,
        cv2.COLOR_BGR2GRAY
    )

    # ---------------------------------------
    # Edge analysis
    # ---------------------------------------

    edges = cv2.Canny(
        gray,
        80,
        180
    )

    edge_density = (
        np.sum(edges[border_pixels] > 0)
        / np.sum(border_pixels)
    )

    # ---------------------------------------
    # Texture analysis
    # ---------------------------------------

    border_values = gray[border_pixels]

    texture_variation = float(
        np.std(border_values)
    )

    # ---------------------------------------
    # Detect suspicious contours
    # ---------------------------------------

    contours, _ = cv2.findContours(
        edges,
        cv2.RETR_EXTERNAL,
        cv2.CHAIN_APPROX_SIMPLE
    )

    large_contours = 0

    for contour in contours:

        area = cv2.contourArea(contour)

        if area > 500:
            large_contours += 1

    # ---------------------------------------
    # Calculate tampering score
    # ---------------------------------------

    tamper_score = 0

    indicators = []

    if edge_density > 0.25:

        tamper_score += 30

        indicators.append(
            "Strong visual discontinuity around QR boundary"
        )

    if texture_variation > 60:

        tamper_score += 25

        indicators.append(
            "Unusual texture variation around QR region"
        )

    if large_contours >= 5:

        tamper_score += 20

        indicators.append(
            "Multiple large visual regions detected around QR"
        )

    tamper_score = min(
        tamper_score,
        100
    )

    # ---------------------------------------
    # Determine tampering level
    # ---------------------------------------

    if tamper_score >= 60:

        level = "HIGH TAMPERING INDICATOR"

    elif tamper_score >= 30:

        level = "SUSPICIOUS"

    else:

        level = "LOW TAMPERING INDICATOR"

    # ---------------------------------------
    # Return result
    # ---------------------------------------

    return {

        "success": True,

        "tamperScore": tamper_score,

        "tamperLevel": level,

        "indicators": indicators,

        "edgeDensity": round(
            float(edge_density),
            4
        ),

        "textureVariation": round(
            texture_variation,
            2
        ),

        "largeContours": large_contours
    }


# ---------------------------------------
# Program entry point
# ---------------------------------------

if __name__ == "__main__":

    if len(sys.argv) < 2:

        print(
            json.dumps({
                "success": False,
                "message": "Image path is required"
            })
        )

        sys.exit(1)

    image_path = sys.argv[1]

    result = analyze_tampering(
        image_path
    )

    print(
        json.dumps(result)
    )