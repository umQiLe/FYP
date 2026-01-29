# PTT Application (Push-To-Talk)

A local, real-time wireless Push-To-Talk (PTT) system designed for classrooms and group interactions. This application allows a lecturer to manage a session where students can request to speak and broadcast audio through the lecturer's system.

## 🚀 Features

- **Real-Time Audio**: Low-latency voice communication using WebSockets and WebRTC.
- **Role-Based Access**:
  - **Lecturer View**: Dashboard to manage students, approve speak requests, and view statistics.
  - **Student View**: Simple interface to "Push to Talk" and join queues.
- **Easy Deployment**:
  - Auto-detects local Wi-Fi IP address.
  - Automated SSL certificate generation (using `mkcert`) for HTTPS.
  - Automatic Windows Firewall configuration.
- **Portable Mode**: Supports running from a portable Node.js environment without system-wide installation.

## 🛠️ Tech Stack

### Backend (`ptt-backend`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time**: `ws` (WebSocket)
- **Security**: `mkcert` (Local SSL), `firebase-admin`
- **Utilities**: `pdfkit` (PDF generation), `dotenv`

### Frontend (`ptt-frontend`)
- **Framework**: React (Vite)
- **Styling**: TailwindCSS, Radix UI
- **Animations**: Framer Motion
- **State/Notifications**: Sonner

## 📋 Prerequisites

- **Operating System**: Windows (Required for network/firewall automation scripts).
- **Node.js**: Version 18+ (or use Portable Mode).
- **mkcert**: Required for generating local SSL certificates.

## 📦 Installation

1. **Clone/Download** the repository.
2. **Install Dependencies**:
   Open a terminal in the root directory and run:
   ```sh
   # Install Backend Dependencies
   cd ptt-backend
   npm install

   # Install Frontend Dependencies
   cd ../ptt-frontend
   npm install
   ```

##  ▶️ Usage

### Quick Start (Recommended)
Double-click **`LAUNCH_PTT.bat`** in the root directory.
- This script will:
  1. Check for Node.js.
  2. Generate SSL certificates for your local IP.
  3. Configure firewall rules temporarily.
  4. Start the backend server.
  5. Automatically open the Lecturer Dashboard in your default browser.

**URL**: `https://<YOUR_LOCAL_IP>:8081`

### Manual Development Mode

**Backend**:
```sh
cd ptt-backend
node serve.js
```
*Port: 8081*

**Frontend** (Hot-reload):
```sh
cd ptt-frontend
npm run dev
```
*Port: 5173*

## 📂 Project Structure

- **`LAUNCH_PTT.bat`**: Main entry point for easy startup.
- **`ptt-backend/`**: Server logic, WebSocket handling, and API.
  - `serve_prod.js`: Production server script used by the launcher.
  - `serve.js`: Development server script with live reload cues.
- **`ptt-frontend/`**: React application source code.
- **`bin/`**: Place `node.exe` and `mkcert.exe` here for portable usage.