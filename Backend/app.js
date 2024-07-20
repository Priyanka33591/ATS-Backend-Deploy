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

    const inputPrompt = `
   You are an experienced Application Tracking System (ATS) specializing in the technology field. Evaluate the following resume against the provided job description. Assign a percentage match and identify any missing keywords with high accuracy.

Resume: ${pdfText.text}
Job Description: ${jd}

Provide the response only its ats percentage:
ATS Score: % /n
AND AFTER TWO LINE GAP:/n/n/n   give a biggest white space

GIVE MISSING KEYWORDS FROM THE RESUME /n/n/n

GIVE SOME SUGGESTIONS TO THE USER TO IMPROVE THE RESUME IN -1 -2 LIKE POINTS /n/n/n

AND THEN AFTER 2 LINE GAP GIVE THE VERY SMALL SUMMARY OF THE RESUME/n/n/n

(AND ALL WITH OUT AND SPECIAL CHARACTER APART FROM (" - , . ")ONLY/n/n

AND VERY IMPORTANT :  NOT MORE THAN 100 WORDS..
AND REMOVE UNNECESSARY TEXT PARAGRAPH OR MARKS , 
IMPORTANT - USE WHITE SPACE AND NEXT LINE IN OUTPUT 

    `;

    const response = await getGeminiResponse(inputPrompt);
    res.json({ response });
  } catch (error) {
    res.status(500).json({ error: error.message });
  } finally {
    fs.unlinkSync(resumePath);
  }
});




app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
