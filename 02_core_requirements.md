# Core Requirements for IntelliTrack: AI-Powered Internship Management System

## Project Information

**Project Name:** IntelliTrack: AI-Powered Internship Management System

**Project Description:**
IntelliTrack is an AI-powered Internship Management System designed to centralize internship management for Bo's Coffee. The system enables interns, company supervisors, company representatives, and school coordinators to efficiently manage internship activities, including attendance monitoring, daily work logs, performance evaluations, internship progress tracking, document management, company announcements, and AI-assisted internship portfolio generation.

---

# Functional Requirements

## User Authentication & Role Management

### Authentication
- **REQ-FR-URM-1:** The system shall allow users to securely log in using their registered credentials.
- **REQ-FR-URM-2:** The system shall allow authorized users to log out of the system.
- **REQ-FR-URM-3:** The system shall restrict access to authenticated users only.

### Role-Based Access Control
- **REQ-FR-URM-4:** The system shall support four user roles: Intern, Company Supervisor, Company Representative, and School Coordinator.
- **REQ-FR-URM-5:** The system shall grant access to system features based on the authenticated user's role.
- **REQ-FR-URM-6:** The system shall prevent users from accessing unauthorized modules and information.

---

## Intern Profile Management

- **REQ-FR-PRO-1:** The system shall allow interns to maintain their personal profile information.
- **REQ-FR-PRO-2:** The system shall display internship details including assigned company, department, supervisor, internship duration, rendered hours, and internship status.
- **REQ-FR-PRO-3:** The system shall display attendance summaries.
- **REQ-FR-PRO-4:** The system shall display internship performance summaries.
- **REQ-FR-PRO-5:** The system shall display the submission status of internship documents.
- **REQ-FR-PRO-6:** The system shall allow interns to manage emergency contact information.
- **REQ-FR-PRO-7:** The system shall display the intern's technical and soft skills.

---

## Attendance Management

### Attendance Recording
- **REQ-FR-ATT-1:** The system shall allow interns to record Clock In and Clock Out attendance.
- **REQ-FR-ATT-2:** The system shall record attendance timestamps.
- **REQ-FR-ATT-3:** The system shall capture GPS coordinates during attendance.
- **REQ-FR-ATT-4:** The system shall verify attendance using geofencing.
- **REQ-FR-ATT-5:** The system shall capture a selfie during attendance verification.
- **REQ-FR-ATT-6:** The system shall maintain attendance history.

### Attendance Verification
- **REQ-FR-ATT-7:** The system shall allow supervisors to verify intern attendance.
- **REQ-FR-ATT-8:** The system shall allow supervisors to approve attendance correction requests.
- **REQ-FR-ATT-9:** The system shall display attendance analytics and summaries.

---

## Daily Work Log Management

- **REQ-FR-DWL-1:** The system shall allow interns to submit daily work logs.
- **REQ-FR-DWL-2:** The system shall allow interns to attach supporting evidence to work logs.
- **REQ-FR-DWL-3:** The system shall maintain a history of submitted work logs.
- **REQ-FR-DWL-4:** The system shall allow supervisors to review submitted work logs.

---

## Task Management

- **REQ-FR-TSK-1:** The system shall allow supervisors to assign internship tasks.
- **REQ-FR-TSK-2:** The system shall allow interns to view assigned tasks.
- **REQ-FR-TSK-3:** The system shall allow supervisors to monitor task completion.

---

## Performance Evaluation

- **REQ-FR-EVL-1:** The system shall allow supervisors to evaluate intern performance.
- **REQ-FR-EVL-2:** The system shall record weekly evaluation scores.
- **REQ-FR-EVL-3:** The system shall display overall performance summaries.
- **REQ-FR-EVL-4:** The system shall collect workmate feedback.
- **REQ-FR-EVL-5:** The system shall allow interns to view completed evaluations.

---

## AI Portfolio Generation

- **REQ-FR-AI-1:** The system shall generate an internship portfolio using verified internship records.
- **REQ-FR-AI-2:** The system shall utilize workmate feedback during portfolio generation.
- **REQ-FR-AI-3:** The system shall utilize internship performance information during portfolio generation.
- **REQ-FR-AI-4:** The system shall allow interns to view and export their generated internship portfolio.

---

## AI Skill & Productivity Analysis

- **REQ-FR-AI-5:** The system shall analyze internship records to identify technical and soft skills.
- **REQ-FR-AI-6:** The system shall generate productivity insights based on internship activities.
- **REQ-FR-AI-7:** The system shall display skill progress throughout the internship.

---

## Document Management

- **REQ-FR-DOC-1:** The system shall allow interns to upload required internship documents.
- **REQ-FR-DOC-2:** The system shall display the submission status of required documents.
- **REQ-FR-DOC-3:** The system shall allow authorized users to review submitted documents.

---

## Company Announcements

- **REQ-FR-ANN-1:** The system shall allow Company Representatives to publish company announcements.
- **REQ-FR-ANN-2:** The system shall allow interns to view company announcements.
- **REQ-FR-ANN-3:** The system shall notify users when new announcements are published.

---

## Reporting

- **REQ-FR-REP-1:** The system shall generate internship reports for supervisors.
- **REQ-FR-REP-2:** The system shall generate internship reports for School Coordinators.
- **REQ-FR-REP-3:** The system shall generate company internship reports for Company Representatives.
- **REQ-FR-REP-4:** The system shall display internship statistics and summaries.

---

# Additional Requirements

The current project requirements document primarily defines **functional requirements**. Separate non-functional requirements (such as system performance, scalability, availability, maintainability, deployment, or security policies) are **not explicitly specified** as standalone requirements. Therefore, no additional requirement IDs have been created for those categories.

---

# Requirement Summary

| Category | Number of Requirements |
|-----------|-----------------------:|
| User Authentication & Role Management | 6 |
| Intern Profile Management | 7 |
| Attendance Management | 9 |
| Daily Work Log Management | 4 |
| Task Management | 3 |
| Performance Evaluation | 5 |
| AI Portfolio Generation | 4 |
| AI Skill & Productivity Analysis | 3 |
| Document Management | 3 |
| Company Announcements | 3 |
| Reporting | 4 |
| **Total Functional Requirements** | **51** |

---

## Requirement Principles

The requirements in this document are:

- Atomic (one requirement per ID)
- Unique and traceable
- Testable
- Solution-independent
- Focused on **what** the system must do rather than **how** it will be implemented
- Derived from the approved project requirements for IntelliTrack