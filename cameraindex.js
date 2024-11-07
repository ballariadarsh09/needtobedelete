// app.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

const app = express();

// Add body parser for JSON
app.use(express.json({ limit: "10mb" }));

// Rest of the configurations remain same...
// (Keep all the previous configurations from the earlier app.js)

// Add new route for camera uploads
app.post("/analyze", async (req, res) => {
  try {
    if (!process.env.GOOGLE_API_KEY) {
      throw new Error("API key is not configured");
    }

    let imageBase64;

    // Handle both form uploads and camera captures
    if (req.file) {
      // Handle file upload
      const imageData = fs.readFileSync(req.file.path);
      imageBase64 = imageData.toString("base64");
      fs.unlinkSync(req.file.path); // Clean up the uploaded file
    } else if (req.body.imageData) {
      // Handle camera capture
      imageBase64 = req.body.imageData.split(",")[1]; // Remove the data URL prefix
    } else {
      throw new Error("No image provided");
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro-vision" });

    const prompt = `You are a food expert. Please analyze this food ingredient image and provide a detailed report including:

    1. Ingredient Identification: What is this ingredient and its basic description?
    2. Nutritional Profile:
       - Key nutrients
       - Caloric content (if applicable)
       - Health benefits
    3. Culinary Applications:
       - Common uses in cooking
       - Popular recipes
       - Flavor pairings
    4. Storage & Handling:
       - Best storage methods
       - Shelf life
       - Signs of freshness/spoilage
    5. Special Considerations:
       - Allergen information
       - Dietary restrictions
       - Substitutes

    Please format the response in a clear, organized manner with proper headings and bullet points.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: "image/jpeg",
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    const analysis = response.text();

    res.render("index", {
      analysis: analysis,
      error: null,
      imagePath: null,
    });
  } catch (error) {
    console.error("Error:", error);
    res.render("index", {
      analysis: null,
      error: error.message,
    });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    "API Key Status:",
    process.env.GOOGLE_API_KEY ? "Present" : "Missing"
  );
});
