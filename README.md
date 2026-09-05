# 🏙️ NagarDrishti : See. Verify. Resolve.
**AI-Driven Civic Infrastructure Verification and Management**

## 📖 Project Description

Municipal authorities receive thousands of citizen complaints regarding civic infrastructure issues such as potholes, garbage dumps, broken streetlights, water leakage, and damaged roads. Existing complaint management systems primarily focus on complaint registration but often struggle with duplicate reports, invalid or irrelevant images, incorrect categorization, manual routing, and delayed prioritization. This ultimately leads to inefficient issue resolution and an increased administrative workload.

**NagarDrishti** (City Vision) is an intelligent civic infrastructure management platform designed to solve this. It enables citizens to report issues conveniently through **WhatsApp** simply by sharing a photograph, an optional description, and their live location.

Instead of directly generating a blind complaint, every report passes through an **AI-driven verification pipeline**:
1. **Computer Vision (YOLOv8):** Validates the image to ensure it is relevant and categorizes the reported issue.
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


## 🛠️ Technical Architecture & Stack

The project follows a polyglot microservices architecture, separating the core backend operations from heavy AI inference tasks.

* **Frontend:** React.js, Tailwind CSS (Interactive municipal dashboard)
* **Backend Core:** Node.js, Express.js (REST APIs, routing, webhook handling)
* **Database:** MongoDB (Geospatial queries, complaint storage)
* **AI Microservices:** Python, FastAPI (Model inference services)
* **Machine Learning:** YOLOv8 + OpenCV (Computer Vision), Hugging Face Transformers (NLP)
* **Integrations:** Twilio (WhatsApp Business API integration)

## 🎯 Impact

By leveraging intelligent automation and analytics, NagarDrishti aims to:
* **Reduce manual administrative effort by 70%+**
* **Improve complaint authenticity and data quality**
* **Accelerate response and resolution times**
* **Promote smarter, data-driven civic infrastructure management**
