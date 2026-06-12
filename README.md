# CONFIDEX Web Platform

CONFIDEX is a capstone project developed as a vending-based, self-service system for anonymous health screening. This repository contains the web platform that supports the user-facing website, administrator dashboard, QR login flow, transaction records, payment tracking, receipt handling, result viewing, and booth monitoring features of the system.

The web platform works together with the CONFIDEX Booth GUI. The website manages the online side of the system, while the booth handles the physical kiosk experience such as QR scanning, product selection, payment, kit dispensing, receipt printing, tutorial display, kit insertion, image capture, and result processing.

## System Overview

The CONFIDEX Web Platform serves as the central online interface for users and administrators. Users can access the system using an anonymous account, generate a QR code for booth login, view their transaction history, check their screening results, request result reviews, download receipts, and look for nearby consultation facilities.

Administrators can use the platform to monitor booth activity, track product and coin inventory, review transactions, manage result images, verify or override screening results, and oversee the overall operation of the CONFIDEX system.

The platform was designed to support a connected kiosk workflow. A user starts from the website, generates a QR login code, scans it at the booth, completes payment, receives a kit, follows the booth instructions, submits the used kit, and later views the result on the website. The website also supports booth status updates and synchronization so that records from the physical kiosk can be reflected online.

## Main Features

### User Features

- Anonymous user registration and login.
- OTP-based account verification.
- Passkey or WebAuthn support for passwordless access.
- QR code generation for kiosk login.
- User dashboard for transactions, receipts, and results.
- Result viewing with support for uploaded result images.
- Result review request feature.
- Receipt and coupon-related request handling.
- Consultation page for nearby health facility guidance.

### Admin Features

- Admin and superadmin login.
- Role-based access for administrative users.
- Admin dashboard for monitoring system activity.
- User, booth, transaction, result, and inventory management views.
- Product and coin stock monitoring.
- Result image viewing, downloading, and cleanup tools.
- Result review queue for validating or overriding automated results.
- Coupon request management.
- Email-based notifications for important operational events.

### Booth Support Features

- QR login validation for booth access.
- Booth status and inventory monitoring.
- Transaction and receipt synchronization from the kiosk.
- Support for online and cash-based booth transactions.
- Result and image upload support from the booth.
- Offline-aware synchronization support for unreliable connectivity.
- Device communication support for booth presence and updates.

## Technologies and Tools Used

### Frontend

- **Next.js 15** — Main React framework used for the web application.
- **React 19** — Component-based user interface development.
- **TypeScript** — Type-safe development across the application.
- **Tailwind CSS 4** — Utility-first styling for responsive layouts.
- **Radix UI / shadcn-style components** — Accessible UI components such as dialogs, forms, tabs, sheets, dropdowns, and tooltips.
- **Lucide React** — Icon library used in the interface.
- **Recharts** — Charts and visual dashboard components.
- **Sonner** — Toast notifications.
- **next-themes** — Theme handling support.

### Backend and Data Handling

- **Next.js server-side functionality** — Used for the platform’s backend logic.
- **Express** — Custom server layer used with the Next.js application.
- **WebSocket technology** — Used for real-time booth presence and communication.
- **MongoDB** — Main database for user records, transactions, booths, receipts, results, admin records, and related system data.
- **Mongoose** — Schema modeling and database access.
- **JWT / Jose** — Token and session handling.
- **bcrypt** — Password hashing.
- **Zod** — Input validation and data checking.
- **Multer / Formidable** — File and multipart upload handling.

### Authentication and Security

- **OTP verification** for account access and registration flows.
- **Admin email OTP** for administrator authentication.
- **Passkeys / WebAuthn** using SimpleWebAuthn.
- **HTTP-only browser sessions** for safer session handling.
- **Role-based access control** for admin and superadmin features.
- **Device authentication** for booth-to-website communication.
- **Offline login support** for booth access when internet connectivity is unstable.

### Storage and External Services

- **Cloudflare R2** — Object storage for result images and uploaded files.
- **AWS SDK S3 Client** — Used to connect the application to Cloudflare R2.
- **PayMongo** — Online payment processing.
- **Nodemailer / Gmail App Passwords** — Email notifications and contact messages.
- **QRCode React** — QR code rendering for user and booth flows.
- **ngrok** — Development tunneling used during booth and website testing.

## Project Structure

```text
Confidex_Web_v2/
├── app/                 # Main Next.js app pages, server routes, and layouts
├── components/          # Reusable UI, dashboard, admin, auth, and common components
├── hooks/               # Custom React hooks used by dashboards and live updates
├── lib/                 # Shared logic for auth, database, storage, payments, mail, and devices
├── models/              # MongoDB and Mongoose data models
├── public/              # Static images, fonts, logos, and team assets
├── server/              # Custom server and real-time booth communication logic
├── package.json         # Project scripts and dependencies
└── next.config.ts       # Next.js configuration
```

## Getting Started

Install the project dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the application:

```bash
npm run build
```

Start the production server:

```bash
npm run start
```

The project uses local configuration files for database access, authentication, storage, email, payment, and booth communication settings. Keep all credentials and private values out of the repository.

## Relationship With the Booth GUI

The CONFIDEX Web Platform is the online companion system of the CONFIDEX Booth GUI. The booth uses the web platform for account verification, QR login, transaction recording, online payment status, receipt records, result upload, image storage, inventory synchronization, and administrator review.

The system was also designed with unreliable network conditions in mind. When the booth is temporarily offline, the booth-side software can continue saving important transaction and result data locally, then synchronize the records with the web platform once the connection becomes available again.

## Capstone Project Members

1. **Christian Angelo Palebino** — Lead Software Engineer / Lead System Architect  
   Led full-stack development, system architecture, database design, image-processing decisions, and software integration across the booth and web platforms.

2. **Mark Clein S. Toriano** — Frontend Developer / Mechanical and Structural Designer  
   Worked on frontend presentation and the physical booth structure, layout, 3D design, usability, accessibility, and component placement.

3. **Micaella Erlyne Chelsen R. Compañero** — Technical Researcher / Compliance Officer  
   Handled technical documentation, research direction, compliance review, system limitations, and best-practice alignment.

4. **Kimberly Shane B. Belledo** — Lead Researcher / Project Manager  
   Led project coordination, procurement planning, budget tracking, material management, and overall system integration.

## Notes

CONFIDEX is a capstone prototype intended to support anonymous preliminary health screening. Results produced by the system should be treated as screening outputs only and should still be followed by proper medical consultation, confirmatory testing, and professional guidance.
