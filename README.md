# 🏙️ NagarDrishti : See. Verify. Resolve.
**AI-Driven Civic Infrastructure Verification and Management**

## 📖 Project Description

Municipal authorities receive thousands of citizen complaints regarding civic infrastructure issues such as potholes, garbage dumps, broken streetlights, water leakage, and damaged roads. Existing complaint management systems primarily focus on complaint registration but often struggle with duplicate reports, invalid or irrelevant images, incorrect categorization, manual routing, and delayed prioritization. This ultimately leads to inefficient issue resolution and an increased administrative workload.

**NagarDrishti** (City Vision) is an intelligent civic infrastructure management platform designed to solve this. It enables citizens to report issues conveniently through **WhatsApp** simply by sharing a photograph, an optional description, and their live location.

Instead of directly generating a blind complaint, every report passes through an **AI-driven verification pipeline**:
1. **Computer Vision (Clip Model):** Validates the image to ensure it is relevant and categorizes the reported issue.
2. **Natural Language Processing (NLP):** Analyzes the accompanying description for context and sentiment.
3. **Duplicate Detection:** Checks against historical and active data to identify if the issue has already been reported.
4. **Severity Assessment:** Assigns a priority/urgency level before automatically routing the issue to the appropriate municipal department.

Beyond complaint registration, NagarDrishti incorporates an **AI-Powered Decision Support Module**. This module continuously analyzes complaint patterns, identifies recurring infrastructure failures, detects high-risk areas, and provides actionable insights through an interactive dashboard. These insights assist municipal authorities in prioritizing resources, planning preventive maintenance, and making data-driven decisions rather than simply reacting to individual complaints.


## ✨ Key Features

* **📱 Frictionless Reporting:** Citizens can report issues directly via WhatsApp without needing to download a separate app.
* **🤖 Automated AI Verification:** Filters out spam, invalid photos, and irrelevant reports automatically.
* **🔀 Smart Routing:** Issues are categorized and sent to the correct municipal department without manual intervention.
* **🚫 Duplicate Elimination:** Identifies overlapping reports to save administrative time and prevent redundant deployments.
* **⚡ Priority Assessment:** AI-driven severity scoring ensures critical issues (e.g., severe water leaks, dangerous potholes) are handled first.
* **📊 Decision Support Dashboard:** Provides authorities with interactive visual insights, predictive maintenance suggestions, and high-risk area detection.


## 🛠️ Technical Stack
NagarDrishti follows a microservices-based architecture that separates core backend operations from AI-powered image classification and text analysis.

| Component | Technologies | Purpose |
|---|---|---|
| **Frontend** | React.js, Tailwind CSS | Interactive municipal dashboard for complaint management, status tracking, and analytics. |
| **Backend Core** | Node.js, Express.js | REST API development, authentication, complaint management, role-based workflows, and WhatsApp webhook handling. |
| **Database** | MongoDB | Stores complaint records and application data. |
| **AI Microservice** | Python, FastAPI | Provides API endpoints for AI-powered image classification and text analysis. |
| **Computer Vision** | Hugging Face CLIP, Pillow (PIL), Requests | Classifies complaint images into categories such as potholes, garbage, water leakage, and other civic issues. |
| **NLP & Text Analysis** | Hugging Face Transformers, DistilBERT | Analyzes complaint descriptions, performs sentiment analysis, categorizes issues using zero-shot classification, and estimates urgency. |
| **WhatsApp Integration** | Twilio WhatsApp API | Supports citizen complaint submission through WhatsApp. |
| **Image Storage** | Cloudinary | Stores complaint images and supports image management. |
| **API Documentation & Testing** | Swagger UI, Postman | Documents, tests, and validates API endpoints. |

## 📋 Prerequisites

-   Node.js v18+ and npm.
-   MongoDB connection string.
-   Twilio credentials if testing WhatsApp integration.
-   Cloudinary credentials if using image storage.
-   Python AI service running if the backend calls it.

## ⚙️ Installation

1. Clone the Repository
``` bash
git clone https://github.com/meenaljo2006/NagarDrishti.git
```
2. Install the backend dependencies
``` bash
npm install
```
3. Then Create `.env` using `.env.example`. All values are placeholders. Never commit real secrets.

4. Database Seeding - The setup mention example Super Admin, Roads Department Admin, and
Field Worker accounts, with a sample password `password123`.
``` bash
node seed.js
```
 
## 🚀 Running the Server
``` bash
npm run dev
```

-   Example base URL: `http://localhost:5000`
-   Swagger UI: `http://localhost:5000/api-docs`

## 🤖 AI Service Integration

The supplied configuration uses `AI_SERVICE_URL=http://localhost:8000`.
The AI service exposes `GET /health`, `POST /classify-image`,
`POST /analyze-text`, and `POST /analyze`. 

## 🎯 Impact

By leveraging intelligent automation and analytics, NagarDrishti aims to:
* **Reduce manual administrative effort by 70%+**
* **Improve complaint authenticity and data quality**
* **Accelerate response and resolution times**
* **Promote smarter, data-driven civic infrastructure management**

## 📚 Related Documentation

-   [System architecture](./docs/system-architecture.md)
-   [Backend API Documentation](./docs/api.md)
-   [AI service README](../ai_service/README.md)

