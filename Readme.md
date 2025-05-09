# Real-Time Chat Application

A modern real-time chat application built with React, Node.js, Socket.io, and MongoDB.

## Features

- Real-time messaging with Socket.io
- User authentication with JWT
- User status indicators (online, away, busy, offline)
- Direct messaging and group chats
- Message read receipts and delivery status
- Emoji reactions to messages
- User typing indicators
- Responsive design for desktop and mobile

## Tech Stack

### Frontend
- React.js (with hooks and context API)
- TailwindCSS for styling
- Socket.io-client for real-time communication
- Formik and Yup for form validation
- Moment.js for time formatting

### Backend
- Node.js with Express
- MongoDB with Mongoose
- Socket.io for real-time communication
- JWT for authentication
- RESTful API architecture

## Getting Started

### Prerequisites
- Node.js (v14.x or higher)
- MongoDB (local installation or MongoDB Atlas account)
- npm or yarn

### Installation & Setup

#### Frontend

1. Navigate to the client directory:

cd client

2. Install dependencies:

npm install

3. Create a .env file in the client directory with the following variables:

VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000

4. Start the development server:

npm run dev

#### Backend

1. Navigate to the server directory:

cd server

2. Install dependencies:

npm install

3. Create a .env file in the server directory with the following variables:

PORT=5000
MONGODB_URI=mongodb://localhost:27017/chat-app
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development

4. Start the development server:

npm run dev
The backend API will be available at http://localhost:5000/api.