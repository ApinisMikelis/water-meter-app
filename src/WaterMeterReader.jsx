import React, { useState, useRef } from "react";
import Tesseract from "tesseract.js";
import axios from "axios";

const WaterMeterReader = ({ tenantId, month }) => {
  const [image, setImage] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [readings, setReadings] = useState({
    hotWater: "",
    coldWater: "",
  });
  const [confirmed, setConfirmed] = useState(false);
  const fileInputRef = useRef();

  const processImage = async (imageFile) => {
    setProcessing(true);

    try {
      // Preprocess image for better OCR results
      const processedImage = await preprocessImage(imageFile);

      // Extract text using Tesseract.js
      const {
        data: { text },
      } = await Tesseract.recognize(processedImage, "eng", {
        logger: (m) => console.log(m),
        tessedit_char_whitelist: "0123456789.",
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });

      // Parse readings from extracted text
      const extractedReadings = parseMeterReadings(text);
      setReadings(extractedReadings);
    } catch (error) {
      console.error("OCR failed:", error);
      alert("Failed to read meter. Please enter manually.");
    } finally {
      setProcessing(false);
    }
  };

  const preprocessImage = (imageFile) => {
    return new Promise((resolve) => {
      const img = new Image();
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      img.onload = () => {
        // Resize and enhance contrast
        canvas.width = img.width * 2;
        canvas.height = img.height * 2;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Apply image enhancements
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        enhanceContrast(imageData);
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob(resolve, "image/jpeg", 0.9);
      };

      img.src = URL.createObjectURL(imageFile);
    });
  };

  const enhanceContrast = (imageData) => {
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      // Simple thresholding for better contrast
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      const value = avg > 128 ? 255 : 0;
      data[i] = value; // R
      data[i + 1] = value; // G
      data[i + 2] = value; // B
    }
  };

  const parseMeterReadings = (text) => {
    // Extract numbers from text
    const numbers = text.match(/\d+\.?\d*/g) || [];

    // Assuming typical format: cold: 123.45, hot: 67.89
    // You can customize based on your meter display
    let coldWater = "";
    let hotWater = "";

    if (numbers.length >= 2) {
      coldWater = numbers[0];
      hotWater = numbers[1];
    } else if (numbers.length === 1) {
      coldWater = numbers[0];
    }

    return { coldWater, hotWater };
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setImage(URL.createObjectURL(file));
      processImage(file);
    }
  };

  const handleManualInput = (type, value) => {
    setReadings((prev) => ({
      ...prev,
      [type]: value,
    }));
  };

  const handleConfirm = async () => {
    if (!readings.hotWater && !readings.coldWater) {
      alert("Please provide readings before confirming");
      return;
    }

    try {
      const response = await axios.post("/.netlify/functions/save-reading", {
        tenantId,
        month,
        readings,
        timestamp: new Date().toISOString(),
      });

      if (response.data.success) {
        setConfirmed(true);
        alert("Reading saved successfully!");
      }
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save readings. Please try again.");
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">Water Meter Reading</h2>

      {!confirmed ? (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">
              Take Photo of Meter
            </label>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoUpload}
              ref={fileInputRef}
              className="w-full p-2 border rounded"
            />
          </div>

          {image && (
            <div className="mb-4">
              <img src={image} alt="Meter" className="max-w-full rounded" />
            </div>
          )}

          {processing && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2">Reading meter...</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Cold Water (m³)
              </label>
              <input
                type="number"
                step="0.01"
                value={readings.coldWater}
                onChange={(e) => handleManualInput("coldWater", e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
                placeholder="Enter cold water reading"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Hot Water (m³)
              </label>
              <input
                type="number"
                step="0.01"
                value={readings.hotWater}
                onChange={(e) => handleManualInput("hotWater", e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-400"
                placeholder="Enter hot water reading"
              />
            </div>

            <button
              onClick={handleConfirm}
              disabled={processing}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              Confirm Readings
            </button>
          </div>
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-green-600 text-5xl mb-4">✓</div>
          <h3 className="text-xl font-semibold mb-2">Reading Confirmed!</h3>
          <p>
            Cold: {readings.coldWater} m³ | Hot: {readings.hotWater} m³
          </p>
        </div>
      )}
    </div>
  );
};

export default WaterMeterReader;
