const dotenv = require('dotenv');
const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const port = 3001;

const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function getGeminiResponse(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text;
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('resume'), async (req, res) => {
  const jd = req.body.jd;
  const resumePath = req.file.path;

  try {
    const dataBuffer = fs.readFileSync(resumePath);
    const pdfText = await pdfParse(dataBuffer);

    const atsScorePrompt = `
      You are an experienced Application Tracking System (ATS) specializing in the technology field. 
      Evaluate the following resume against the provided job description. Assign a percentage match.
      Show Only ATS SCORE in Percentage

      Resume: ${pdfText.text}
      Job Description: ${jd}

    `;
    const atsScore = await getGeminiResponse(atsScorePrompt);

    const missingKeywordsPrompt = `
      Identify any missing keywords with high accuracy from the resume compared to the job description. show only 5 missing keywords. USE BOOLET INSTEAD OF **.
      SHOW ONLY MOST RELVENT MISSING KEYWORDS , DEPENDS ON JOB DESCRIPTION . USE MISSING SKILLS FOR MISSING KEYWORDS DEPENDS ON JOB DESCRIPTION.

      Resume: ${pdfText.text}
      Job Description: ${jd}

    `;
    const missingKeywords = await getGeminiResponse(missingKeywordsPrompt);

    const suggestionsPrompt = `
      Give some suggestions to the user to improve the resume in  3-4 points only. IN 25 WORDS ONLY . USE BOOLET INSTEAD OF **.
      IMPORTANT - REMOVE '**'

      Resume: ${pdfText.text}
      Job Description: ${jd}

    `;
    const suggestions = await getGeminiResponse(suggestionsPrompt);

    const summaryPrompt = `
      Give a very small summary of the resume. IN 50 WORDS

      Resume: ${pdfText.text}

    `;
    const summary = await getGeminiResponse(summaryPrompt);

    res.json({ atsScore, missingKeywords, suggestions, summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlinkSync(resumePath);
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
