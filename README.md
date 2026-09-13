# DevWave E-commerce API

A full-stack e-commerce backend built with Node.js, Express, TypeScript, and MongoDB. This project provides a robust RESTful API for managing products, categories, users, carts, orders, feedback, authentication, and more. It is designed for modern e-commerce applications and includes features like JWT authentication, role-based authorization, Swagger API docs, and file uploads.

## Features

- **User Authentication**: OTP-based login, JWT tokens, role-based access (user/admin)
- **Product Management**: CRUD operations, filtering, and search
- **Category Management**: CRUD for product categories
- **Cart System**: Add, update, remove, and clear cart items
- **Order Management**: Place orders, view order history, admin order controls
- **Feedback System**: Product reviews and ratings
- **File Uploads**: Integrated with Uploadthing
- **Swagger API Documentation**: Interactive docs at `/docs`
- **Environment-based Config**: `.env.development` and `.env.production` support

## Tech Stack

- Node.js, Express, TypeScript
- MongoDB & Mongoose
- Zod for validation
- JWT for authentication
- Nodemailer for email (OTP)
- Swagger for API docs
- Uploadthing for file uploads

## Getting Started

### 1. Clone the repository

```sh
git clone https://github.com/your-username/devwave-ecommerce-api.git
cd devwave-ecommerce-api
```

### 2. Install dependencies

```sh
npm install
```

### 3. Configure environment variables

Copy `.env.development` and/or `.env.production` and update values as needed:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
EMAIL_SERVICE=gmail
EMAIL_USER=your_email@gmail.com
EMAIL_APP_PASSWORD=your_app_password
EMAIL_FROM=DevWave E-commerce
UPLOADTHING_TOKEN=your_uploadthing_token
```

### 4. Build the project

```sh
npm run build
```

### 5. Start the development server

```sh
npm run dev
```

The server will run on `http://localhost:3000` by default.

## API Documentation

Swagger UI is available at:  
`http://localhost:3000/docs`

## Project Structure

```
.
├── src/
│   ├── config/         # Environment, Swagger, Upload config
│   ├── controllers/    # Route controllers (business logic)
│   ├── lib/            # Constants, utilities, validators
│   ├── middleware/     # Auth and other middleware
│   ├── models/         # Mongoose models
│   ├── routes/         # Express route definitions
│   ├── scripts/        # Seed and utility scripts
│   ├── services/       # Email and other services
│   └── index.ts        # App entry point
├── data.json           # Sample data
├── package.json
├── tsconfig.json
├── vercel.json
└── .env.development / .env.production
```

## Scripts

- `npm run dev` — Start the server in development mode (with hot reload)
- `npm run build` — Compile TypeScript to JavaScript
- `npm start` — Start the compiled server
- `npm run vercel-build` — Build for Vercel deployment

## Api docs

You can check endpoints docs for the project on https://training-in-dev-wave-full-stack-e-c.vercel.app/docs

## Deployment

This project is ready for deployment on [Vercel](https://vercel.com/) (see `vercel.json`).

## License

[ISC](LICENSE)

---

**Made with ❤️ for DevWave Training**
