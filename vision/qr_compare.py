import cv2
import numpy as np
import sys
import json


def compare_qr_images(original_path, scanned_path):

    original = cv2.imread(original_path)
    scanned = cv2.imread(scanned_path)

    if original is None:
        return {
            "success": False,
            "message": "Original QR image could not be read"
        }

    if scanned is None:
        return {
            "success": False,
            "message": "Scanned QR image could not be read"
        }

    # Convert both images to grayscale
    original_gray = cv2.cvtColor(
        original,
        cv2.COLOR_BGR2GRAY
    )

    scanned_gray = cv2.cvtColor(
        scanned,
        cv2.COLOR_BGR2GRAY
    )

    # Resize scanned image to original dimensions
    scanned_gray = cv2.resize(
        scanned_gray,
        (
            original_gray.shape[1],
            original_gray.shape[0]
        )
    )

    # Threshold both images
    _, original_binary = cv2.threshold(
        original_gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    _, scanned_binary = cv2.threshold(
        scanned_gray,
        0,
        255,
        cv2.THRESH_BINARY + cv2.THRESH_OTSU
    )

    # Compare the QR structures
    difference = cv2.absdiff(
        original_binary,
        scanned_binary
    )

    different_pixels = np.sum(
        difference > 50
    )

    total_pixels = difference.size

    difference_ratio = (
        different_pixels / total_pixels
    )

    difference_percentage = (
        difference_ratio * 100
    )

    # Determine result
    if difference_percentage >= 25:

        status = "POSSIBLE OVERLAY"

        message = (
            "Significant visual differences detected "
            "between the trusted QR and scanned QR."
        )

    elif difference_percentage >= 10:

        status = "SUSPICIOUS"

        message = (
            "Some visual differences were detected "
            "between the trusted and scanned QR."
        )

    else:

        status = "MATCH"

        message = (
            "The scanned QR is visually similar "
            "to the trusted QR."
        )

    return {

        "success": True,

        "status": status,

        "differencePercentage": round(
            difference_percentage,
            2
        ),

        "message": message
    }


if __name__ == "__main__":

    if len(sys.argv) < 3:

        print(
            json.dumps({
                "success": False,
                "message":
                    "Original and scanned image paths are required"
            })
        )

        sys.exit(1)

    original_path = sys.argv[1]

    scanned_path = sys.argv[2]

    result = compare_qr_images(
        original_path,
        scanned_path
    )

    print(
        json.dumps(result)
    )