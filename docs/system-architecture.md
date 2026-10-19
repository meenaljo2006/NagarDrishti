# 🏗️ NagarDrishti: System Architecture & Workflow
This document outlines the technical architecture and the complete end-to-end lifecycle of a complaint.

---

## 🏛️ 1. System Architecture

The platform is built using a **Microservices Architecture** to ensure scalability and separation of concerns.

### Core Components:
1. **WhatsApp Interface (Twilio API)**: The entry point for citizens. No app download required.
2. **Node.js Backend (Express)**: The central orchestrator. Handles webhooks, database operations, user authentication (JWT), and role-based routing.
3. **Python AI Microservice (FastAPI)**: A dedicated service for heavy machine learning tasks (CLIP for vision, Hugging Face for NLP).
4. **MongoDB Atlas**: Cloud database for storing user data, complaints, geospatial coordinates, and analytics.
5. **Cloudinary**: Cloud storage for permanent, public image URLs (Before/After photos, evidence).
6. **React Frontend (Upcoming)**: Role-based dashboards for Super Admins, Department Admins, and Field Workers.

---

## 🔄 2. End-to-End Workflow

The lifecycle of a complaint passes through 5 major phases.

### Phase 1: Reporting (Citizen)
1. Citizen spots an issue (e.g., a pothole).
2. Sends a **Photo, Text Description, and Location** to the NagarDrishti WhatsApp Sandbox number.
3. Twilio receives the message and forwards it to the Node.js Backend via Webhook.

### Phase 2: AI Verification Pipeline (Backend + Python AI)
When the webhook receives the data, it triggers a rigorous 5-step AI pipeline:
*   **Check 1: Image Validation (CLIP)**: Validates if the image shows a real civic issue.
*   **Check 2: Text Analysis (Hugging Face NLP)**: Extracts keywords and detects the category from the text.
*   **Check 3: Cross-Validation**: Ensures the image category and text category match. (e.g., Rejects if the image is a dog but the text says "Pothole").
*   **Check 4: Duplicate Detection**: Queries MongoDB to see if a similar complaint exists within a 100-meter radius.
*   **Check 5: Severity Assessment**: Calculates a priority score (High/Medium/Low) based on the category, text urgency, and image confidence.

**Outcome**: If valid and not a duplicate, the complaint is saved to MongoDB with a `verified` status and routed to the respective department (e.g., Roads). The citizen receives an acknowledgment message.

### Phase 3: Assignment (Department Admin)
1. The Department Admin (e.g., Roads Admin) logs into their dashboard.
2. Views the `verified` complaints sorted by Priority.
3. Reviews the details and **Assigns** the complaint to a specific Field Worker (Zone-wise).
4. Citizen receives a WhatsApp update: *"Team has been assigned."*

### Phase 4: Execution (Field Worker)
1. The Field Worker logs into their app and views their assigned tasks.
2. Upon arriving at the location, they click **Start Work** and upload a **"Before Photo"**.
3. Citizen receives an update: *"Work has started."*
4. Once fixed, the worker clicks **Resolve**, uploads an **"After Photo"**, and adds a Work Note (e.g., "Pothole filled and leveled").
5. Citizen receives a notification: *"Work completed, pending admin approval."*

### Phase 5: Closure & Feedback (Admin & Citizen)
1. The Department Admin reviews the Before/After photos and the Work Note.
2. Clicks **Approve & Close**.
3. The complaint status changes to `closed`.
4. **Cascade Notification**: The original reporter *and* anyone whose complaint was marked as a duplicate receive a final WhatsApp message: *"Your complaint has been officially resolved."*

---

## 👥 3. Authority Hierarchy

The system enforces strict Role-Based Access Control (RBAC):
1. **Super Admin (Municipal Commissioner)**: City-wide overview, analytics, and user management (creating Department Admins).
2. **Department Admin (Roads/Sanitation/Water Heads)**: Department-specific oversight, assigning tasks to field teams, and verifying final resolutions.
3. **Field Worker (Field Team)**: Receives assigned tasks, uploads proof of work (Before/After photos).
