// app.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
require("dotenv").config();

const app = express();

console.log(
  "API Key Status:",
  process.env.GOOGLE_API_KEY ? "Present" : "Missing"
);
// Set up EJS
app.set("view engine", "ejs");
app.use(express.static("public"));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5000000 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
      return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
  },
});

// Routes
app.get("/", (req, res) => {
  res.render("index", { analysis: null, error: null });
});

app.post("/analyze", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      throw new Error("Please select an image to analyze");
    }

    // Initialize Gemini API
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    // Read the uploaded image
    const imageData = fs.readFileSync(req.file.path);
    const imageBase64 = imageData.toString("base64");

    const prompt = `
    Just give rating out of 10 based on the following below criteria :
    
    
    Analyze this food ingredient image and provide detailed information about:

    1. Ingredient Identification
    2. Nutritional Benefits
    3. Allergen Warnings
    4. Good , Bad or worst for a normal person
    
    Please format the response clearly with headings and bullet points where appropriate.




    
    `;

    //     const prompt = `Analyze this food ingredient image and provide detailed information about:
    //     1. Ingredient Identification
    //     2. Nutritional Benefits
    //     5. Allergen Warnings
    //     4. Good or Bad for Normal person

    //     Please format the response clearly with headings and bullet points where appropriate.

    // And Just give rating based on the following criteria:
    // 1. Good for Normal Person
    // 2. Nutritional Benefits
    // 3. Ingredient Identification

    //     `;

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

    // Delete uploaded file after analysis
    fs.unlinkSync(req.file.path);

    res.render("index", {
      analysis: analysis,
      error: null,
      imagePath: req.file.filename,
    });
  } catch (error) {
    console.error("Error:", error);
    res.render("index", {
      analysis: null,
      error: error.message,
    });
  }
});

// // Error handler
app.use((error, req, res, next) => {
  console.error(error);
  res.render("index", {
    analysis: null,
    error: error.message,
  });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
