# Architecture Documentation

## Project Information

**Project Name:** IntelliTrack: AI-Powered Internship Management System

**Architecture Pattern:** Modular Layered Architecture with Clean Architecture Boundaries

**Technology Stack:**
- Next.js (App Router)
- React
- TypeScript
- Prisma ORM
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- Google Gemini API
- Tailwind CSS
- shadcn/ui

---

# Architecture Overview

IntelliTrack follows a **Modular Layered Architecture** inspired by **Clean Architecture** principles. The system separates business rules from frameworks, databases, and external services to improve maintainability, scalability, and testability.

The architecture consists of four primary layers:

1. Presentation Layer
2. Application Layer
3. Domain Layer
4. Infrastructure Layer

Each layer has clearly defined responsibilities and dependencies. The Presentation Layer communicates only with the Application Layer, while the Domain Layer remains independent of external technologies.

---

## Architecture Diagram

![Architecture Diagram](./diagrams/architecture-overview.png)

---

# Core Layers

## 1. Presentation Layer

### Responsibility

The Presentation Layer is responsible for user interaction and rendering the web interface.

### Components

- Login
- Role-Based Dashboards
- Attendance Pages
- Work Log Pages
- Task Management
- Performance Evaluation
- Workmate Feedback
- Document Management
- Portfolio Viewer
- Reports
- Settings

### Responsibilities

- Display data
- Collect user input
- Perform client-side validation
- Manage UI state
- Call Server Actions
- Call Route Handlers
- Display loading and error states

### Technologies

- Next.js App Router
- React
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form

---

## 2. Application Layer

### Responsibility

The Application Layer coordinates all business operations.

It contains application services and use cases but does not contain infrastructure-specific code.

### Use Cases

- Authenticate User
- Retrieve Dashboard
- Record Attendance
- Submit Work Log
- Assign Tasks
- Submit Evaluations
- Submit Feedback
- Upload Documents
- Publish Announcements
- Generate Reports
- Generate AI Portfolio

### Services

- Authentication Service
- Authorization Service
- Attendance Service
- Internship Service
- Work Log Service
- Task Service
- Evaluation Service
- Feedback Service
- Document Service
- Portfolio Service
- AI Analysis Service
- Reporting Service
- Notification Service

### Responsibilities

- Coordinate workflows
- Validate business operations
- Execute business rules
- Invoke repositories
- Invoke AI services
- Manage transactions

---

## 3. Domain Layer

### Responsibility

The Domain Layer contains the core business model of IntelliTrack.

It is independent from databases, frameworks, UI, and cloud providers.

### Core Entities

- User
- Intern
- Company
- School
- Internship Assignment
- Attendance
- Work Log
- Task
- Evaluation
- Workmate Feedback
- Skill
- Productivity Insight
- Portfolio
- Document
- Announcement
- Report

### Repository Interfaces

- UserRepository
- InternshipRepository
- AttendanceRepository
- WorkLogRepository
- TaskRepository
- EvaluationRepository
- DocumentRepository
- PortfolioRepository
- AnnouncementRepository

### Provider Interfaces

- AuthenticationProvider
- StorageProvider
- AIProvider
- LocationProvider

### Business Rules

Examples include:

- One user must have exactly one role.
- Attendance requires a valid internship assignment.
- Attendance must satisfy location verification.
- Attendance corrections require supervisor approval.
- Only authorized users may evaluate interns.
- Portfolio generation uses verified internship records.
- Reports are restricted by user role.

---

## 4. Infrastructure Layer

### Responsibility

Provides concrete implementations for all external services.

### Database

Supabase PostgreSQL

Stores:

- Users
- Internship data
- Attendance
- Work Logs
- Evaluations
- Reports
- AI Results
- Document Metadata

---

### ORM

Prisma ORM

Responsibilities

- Database Access
- Query Generation
- Migrations
- Transactions

---

### Authentication

Supabase Auth

Responsibilities

- Login
- Sessions
- Identity
- Password Management

---

### Storage

Supabase Storage

Stores

- Internship Documents
- Attendance Selfies
- Work Log Attachments
- Portfolio PDFs

---

### Artificial Intelligence

Google Gemini API

Responsibilities

- Analyze Work Logs
- Generate Skill Analysis
- Generate Productivity Insights
- Generate Internship Portfolio
- Generate Professional Summary

---

### Maps

React Leaflet

Leaflet

OpenStreetMap

Responsibilities

- Display attendance location
- Show geofence
- Visualize internship location

---

# Layer Dependency Rules

The architecture follows strict dependency rules.

```text
Presentation
        │
        ▼
Application
        │
        ▼
Domain

Infrastructure implements interfaces
defined by the Domain/Application layers.
```

The Domain Layer must never depend on:

- React
- Next.js
- Prisma
- Supabase
- Google Gemini
- Tailwind CSS

---

# Cross-Cutting Concerns

## Authentication

- Managed by Supabase Auth
- Session-based authentication
- Secure cookies
- Role verification

---

## Authorization

Role-Based Access Control (RBAC)

Supported Roles

- Intern
- Company Supervisor
- Company Representative
- School Coordinator

Authorization is enforced within application services.

---

## Validation

Validation occurs at three levels.

### Client Validation

- React Hook Form

### Request Validation

- Zod

### Business Validation

Domain Rules

---

## Error Handling

Application errors are categorized as:

- Validation Errors
- Authentication Errors
- Authorization Errors
- Business Rule Violations
- Infrastructure Errors
- Database Errors
- AI Service Errors

Errors returned to the client are sanitized.

---

## Logging

The application records:

- Attendance submissions
- Login attempts
- Evaluation submissions
- Document uploads
- Portfolio generation
- Administrative actions

Sensitive information is never logged.

---

## Configuration

Environment variables include:

- Database URL
- Supabase URL
- Supabase Keys
- Gemini API Key
- Storage Buckets
- Application URL

---

# Integration Patterns

## Database Integration

Presentation

↓

Application Services

↓

Repository Interfaces

↓

Prisma

↓

Supabase PostgreSQL

---

## Authentication Flow

User

↓

Supabase Auth

↓

Application

↓

Role Verification

↓

Dashboard

---

## Storage Flow

Upload Request

↓

Validation

↓

Supabase Storage

↓

Metadata saved to PostgreSQL

---

## AI Flow

Verified Internship Data

↓

AI Analysis Service

↓

Google Gemini API

↓

Generated Portfolio

↓

Database

---

## Attendance Flow

User

↓

GPS

↓

Geofence Validation

↓

Attendance Service

↓

Attendance Repository

↓

Database

---

# Component Interactions

## Attendance

Intern

↓

Attendance Page

↓

Attendance Service

↓

Location Verification

↓

Attendance Repository

↓

PostgreSQL

---

## Work Log

Intern

↓

Work Log Page

↓

Work Log Service

↓

Database

↓

Supervisor Review

---

## Evaluation

Supervisor

↓

Evaluation Module

↓

Evaluation Service

↓

Evaluation Repository

↓

Database

---

## AI Portfolio

Intern

↓

Portfolio Request

↓

Portfolio Service

↓

AI Analysis Service

↓

Gemini API

↓

Portfolio Repository

↓

Database

↓

Portfolio PDF

---

# Interface Contracts

## Authentication Provider

Responsibilities

- Authenticate users
- Retrieve current user
- Logout users

---

## User Repository

Responsibilities

- Retrieve user profile
- Update user profile
- Retrieve user role

---

## Attendance Repository

Responsibilities

- Record attendance
- Retrieve attendance
- Retrieve attendance history

---

## Internship Repository

Responsibilities

- Retrieve internship assignment
- Update internship progress

---

## Document Repository

Responsibilities

- Store metadata
- Retrieve metadata
- Update review status

---

## Portfolio Repository

Responsibilities

- Store AI portfolio
- Retrieve generated portfolio
- Export portfolio

---

## AI Provider

Responsibilities

- Analyze work logs
- Generate skill analysis
- Generate productivity analysis
- Generate internship portfolio

---

# Module Overview

The application consists of the following core modules:

- Authentication
- User Management
- Internship Management
- Attendance Management
- Work Log Management
- Task Management
- Evaluation Management
- Workmate Feedback
- Document Management
- Announcements
- AI Analysis
- Portfolio Generation
- Reporting

---

# Architecture Principles

The IntelliTrack architecture follows these principles:

- Separation of Concerns
- Clean Architecture
- Modular Design
- Dependency Inversion
- Repository Pattern
- Interface-Based Programming
- Role-Based Security
- Cloud-Native Integration
- Type Safety
- Scalability
- Maintainability
- Testability

---

# Conclusion

The IntelliTrack architecture provides a scalable, modular, and maintainable foundation for the Internship Management System. By separating presentation, application, domain, and infrastructure concerns, the system remains adaptable to future enhancements while keeping the core business logic independent of external frameworks and services. The selected architecture aligns with the project's technology stack and supports secure authentication, AI integration, attendance verification, document management, and internship lifecycle management through well-defined modules and interfaces.