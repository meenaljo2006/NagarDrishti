# 📡NagarDrishti - API Reference
Provides REST APIs for authentication, complaint management, field operations, and analytics.

## 🔐 Authentication & Roles

The API uses JWT (JSON Web Tokens). Include the token in the header of
protected requests:

``` http
Authorization: <your_jwt_token_here>
```
-   **Super Admin:** City-wide access; manages users and departments.
-   **Dept Admin:** Manages complaints and field workers for their
    department.
-   **Field Worker:** Views assigned tasks and uploads proof of work.

### 1. System & Health

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/health` | Public | Checks server and database health, if implemented. |
| `GET` | `/` | Public | Returns basic API information. |

### 2. WhatsApp Webhook

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/webhook/whatsapp` | Public (Twilio) | Receives WhatsApp messages, images, and locations, triggers the AI pipeline, and saves complaints to MongoDB. |

### 3. Authentication

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | Public | Authenticates a user and returns user details and a JWT token. |
| `GET` | `/api/auth/me` | Protected (All Roles) | Retrieves the profile of the currently authenticated user. |

#### 3.1 Login API — `POST /api/auth/login`

**Request Body:**

```json
{
  "email": "admin@nagardrishti.com",
  "password": "password123"
}
```

**Authorization:** Not required.

**Response:** Returns user details and a JWT token upon successful authentication.

#### 3.2 Get Current User API — `GET /api/auth/me`

**Request Header:**

```http
Authorization: Bearer <your_jwt_token>
```

**Response:** Returns the profile details of the authenticated user.

### 4. Admin Operations (Super Admin & Dept Admin)

These APIs allow administrators to manage complaints, assign field workers, reject invalid reports, and close resolved complaints.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/complaints` | Admin | Retrieves active complaints for the administrator's department. |
| `GET` | `/api/admin/field-team` | Admin | Retrieves field workers belonging to the administrator's department. |
| `PUT` | `/api/admin/complaints/{id}/assign` | Admin | Assigns a verified complaint to a field worker. |
| `PUT` | `/api/admin/complaints/{id}/reject` | Admin | Rejects a complaint with a specified reason. |
| `PUT` | `/api/admin/complaints/{id}/close` | Admin | Closes a resolved complaint after reviewing the work evidence. |

#### 5.1 Assign Complaint to Field Worker

**Endpoint:** `PUT /api/admin/complaints/{id}/assign`

**Request Body:**

```json
{
  "teamId": "<WORKER_ID>"
}
```

**Parameters:**
- `id` — MongoDB ID of the complaint.
- `teamId` — MongoDB ID of the field worker.

**Expected Result:** The complaint is assigned to the selected field worker.

#### 5.2 Reject Complaint

**Endpoint:** `PUT /api/admin/complaints/{id}/reject`

**Request Body:**

```json
{
  "reason": "This is not a civic issue. Please report properly."
}
```

**Parameters:**
- `id` — MongoDB ID of the complaint.

**Expected Result:** The complaint is rejected with the specified reason.

#### 5.3 Close Complaint

**Endpoint:** `PUT /api/admin/complaints/{id}/close`

**Request Body:**

```json
{
  "adminNote": "Work verified and approved."
}
```

**Parameters:**
- `id` — MongoDB ID of the complaint.

**Expected Result:** The complaint is closed after the administrator verifies the completed work, provided it meets the backend's status requirements.

#### 🧪 Testing Admin Operations

1. Log in through `POST /api/auth/login` using a department admin account.
2. Copy the JWT token and authorize requests in Swagger.
3. Call `GET /api/admin/complaints` to retrieve complaints.
4. Call `GET /api/admin/field-team` to retrieve field workers.
5. Use the returned IDs to test complaint assignment and rejection.
6. Test complaint closure after a field worker has resolved a complaint and uploaded the required evidence.

**Note:** A department admin should be restricted to their department, while a super admin may have city-wide access, according to the configured authorization rules.

### 5. Super Admin Exclusive Operations

These APIs allow the Super Admin to manage users and create department administrators or field workers.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/admin/users` | Super Admin | Retrieves all users, including administrators and field workers. |
| `POST` | `/api/admin/users` | Super Admin | Creates a new department administrator or field worker. |

#### 5.1 Create User

**Endpoint:** `POST /api/admin/users`

**Request Body:**

```json
{
  "name": "New User",
  "email": "newuser@nagardrishti.com",
  "phone": "+919999999999",
  "password": "password123",
  "role": "dept_admin",
  "department": "roads",
  "zone": "North Zone"
}
```

**Parameters:**

- `name` — Name of the user.
- `email` — Email address of the user.
- `phone` — Contact number.
- `password` — User's password.
- `role` — User role: `dept_admin` or `field_worker`.
- `department` — Assigned department, such as `roads` or `sanitation`.
- `zone` — Assigned zone; required for field workers according to the supplied specification.

**Expected Result:** Creates a new user with the specified role and department permissions.

**Note:** Department administrators may also be permitted to create field workers within their own department, depending on the backend's authorization rules.

### 6. Field Worker Operations

These APIs allow field workers to view assigned tasks, upload work evidence, and update complaint statuses.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/field/my-tasks` | Field Worker | Retrieves tasks assigned to the logged-in field worker. |
| `PUT` | `/api/field/complaints/{id}/start` | Field Worker | Marks a task as in progress and uploads a before-work photo. |
| `PUT` | `/api/field/complaints/{id}/resolve` | Field Worker | Marks a task as resolved and uploads an after-work photo with a work note. |

#### 6.1 Start Work

**Endpoint:** `PUT /api/field/complaints/{id}/start`

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `beforeImage` | File | Photo of the issue before work begins. |

#### 6.2 Resolve Work

**Endpoint:** `PUT /api/field/complaints/{id}/resolve`

**Content-Type:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `afterImage` | File | Photo of the issue after the work is completed. |
| `workNote` | Text | Description of the work completed, e.g., `Pothole filled and leveled.` |

### 🧪 Testing Field Worker Operations

1. **Login:** Call `POST /api/auth/login` using the field worker's development credentials.
2. **Authorize:** Copy the returned JWT token and authorize requests in Swagger.
3. **View Tasks:** Execute `GET /api/field/my-tasks` and copy the ID of an assigned complaint.
4. **Start Work:** Execute `PUT /api/field/complaints/{id}/start`, enter the complaint ID, and upload a before-work photo.
5. **Resolve Work:** Execute `PUT /api/field/complaints/{id}/resolve`, upload an after-work photo, and provide a work note.
6. **Close Complaint:** Log in as a department admin and call `PUT /api/admin/complaints/{id}/close` with the complaint ID and admin note.

**Expected workflow:** `assigned` → `in_progress` → `resolved` → `closed`

### 7. Analytics & Dashboard Data

These APIs provide complaint statistics, department-wise analytics, geographical heatmap data, and complaint trends for the municipal dashboard.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/analytics/super-admin` | Super Admin | Retrieves city-wide statistics, complaint status and category breakdowns, and average resolution time. |
| `GET` | `/api/analytics/dept-admin` | Dept Admin | Retrieves analytics filtered by the administrator's department. |
| `GET` | `/api/analytics/heatmap` | Admin | Returns complaint location, category, and priority data for map visualization. |
| `GET` | `/api/analytics/trends` | Admin | Returns a seven-day timeline of complaint counts for trend charts. |

### 🧪 Testing Analytics & Dashboard APIs

#### Step 1: Test as Super Admin

1. Log in using `POST /api/auth/login` with your Super Admin development account.
2. Copy the JWT token and authorize requests in Swagger.

**Test 1: City-Wide Statistics**

- **Endpoint:** `GET /api/analytics/super-admin`
- **Expected Result:** Statistics such as total complaints, status breakdown, category breakdown, and average resolution time.

**Test 2: Complaint Heatmap**

- **Endpoint:** `GET /api/analytics/heatmap`
- **Expected Result:** An array of complaint locations and related information for map visualization.

**Test 3: Complaint Trends**

- **Endpoint:** `GET /api/analytics/trends`
- **Expected Result:** Complaint counts over seven days for line-chart visualization.

#### Step 2: Test as Department Admin

1. Log in using `POST /api/auth/login` with your Roads Department Admin development account.
2. Copy the new JWT token and update the Swagger authorization.

**Test 4: Department-Specific Statistics**

- **Endpoint:** `GET /api/analytics/dept-admin`
- **Expected Result:** Analytics limited to the Roads department, subject to the backend's authorization and filtering logic.

**Test 5: Department Heatmap and Trends**

- **Endpoints:** `GET /api/analytics/heatmap` and `GET /api/analytics/trends`
- **Expected Result:** Complaint locations and trends filtered according to the logged-in administrator's permissions, if department filtering is implemented for these endpoints.

**Note:** Response fields and department-level filtering should be verified against the actual backend implementation. Use seeded data to validate the results.

## 🗄️ Test Accounts (From Seed Script)

The following test accounts can be used to test role-based access and dashboard functionality, provided they are created by the project's seed script.

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@nagardrishti.com` | `password123` |
| Dept Admin (Roads) | `roads@nagardrishti.com` | `password123` |
| Dept Admin (Sanitation) | `sanitation@nagardrishti.com` | `password123` |
| Field Worker (Roads) | `amit@nagardrishti.com` | `password123` |

> **🔐 Security Notice:** These credentials are intended for local development and testing only. Never use default passwords in production or expose real credentials in a public repository.



