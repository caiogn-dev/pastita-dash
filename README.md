# Pastita Dashboard

Admin dashboard for the Pastita e-commerce platform, built with React, TypeScript, and Vite.

## Features

- **Dashboard**: Real-time overview of orders, messages, and business metrics
- **WhatsApp Management**: Manage WhatsApp Business accounts and conversations
- **Order Management**: View and manage customer orders
- **Payment Tracking**: Monitor payment status and transactions
- **Product Management**: CRUD operations for products
- **Delivery Zones**: Configure delivery areas and pricing
- **Coupons**: Create and manage discount coupons
- **Campaigns**: Marketing campaign management
- **Automation**: Configure automated WhatsApp responses
- **Audit Logs**: Track system activity and data exports
- **Langflow Integration**: AI-powered conversation flows

## Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Zustand** - State management
- **Axios** - HTTP client
- **React Hot Toast** - Notifications
- **Heroicons** - Icons
- **Leaflet** - Interactive maps (OpenStreetMap)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The app runs at: `http://localhost:5173`

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Backend API URL
VITE_API_URL=http://localhost:8000/api/v1

# WebSocket URL (optional, derived from API URL if not set)
VITE_WS_URL=ws://localhost:8000/ws
```

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── common/         # Generic components (Button, Input, Modal, etc.)
│   ├── layout/         # Layout components (Sidebar, Header)
│   └── map/            # Map components (InteractiveMap)
├── pages/              # Page components
│   ├── accounts/       # WhatsApp account management
│   ├── audit/          # Audit logs and exports
│   ├── automation/     # Automation configuration
│   ├── campaigns/      # Marketing campaigns
│   ├── conversations/  # Chat conversations
│   ├── coupons/        # Coupon management
│   ├── dashboard/      # Main dashboard
│   ├── delivery/       # Delivery zones
│   ├── langflow/       # Langflow integration
│   ├── messages/       # Message history
│   ├── orders/         # Order management
│   ├── payments/       # Payment tracking
│   ├── products/       # Product management
│   └── settings/       # App settings
├── services/           # API service modules
│   ├── api.ts          # Axios instance
│   ├── audit.ts        # Audit API
│   ├── automation.ts   # Automation API
│   ├── campaigns.ts    # Campaigns API
│   ├── conversations.ts # Conversations API
│   ├── delivery.ts     # Delivery zones API
│   ├── geocoding.ts    # Geocoding API
│   ├── langflow.ts     # Langflow API
│   ├── orders.ts       # Orders API
│   ├── payments.ts     # Payments API
│   ├── websocket.ts    # WebSocket connections
│   └── whatsapp.ts     # WhatsApp API
├── stores/             # Zustand state stores
│   ├── authStore.ts    # Authentication state
│   └── accountStore.ts # WhatsApp accounts state
├── types/              # TypeScript type definitions
└── App.tsx             # Main app component with routing
```

## Available Scripts

```bash
# Development
npm run dev           # Start dev server
npm run build         # Build for production
npm run preview       # Preview production build

# Code Quality
npm run lint          # Run ESLint
npm run type-check    # Run TypeScript compiler
```

## API Integration

The dashboard connects to the Pastita backend API. All API calls are made through the services in `src/services/`.

### Authentication

Uses token-based authentication. The token is stored in the Zustand auth store and automatically included in API requests via Axios interceptors.

### WebSocket

Real-time updates are received via WebSocket connections for:
- Notifications
- Dashboard updates
- Order status changes
- Payment status changes
- Chat messages

## Map Integration

Uses OpenStreetMap with Leaflet for:
- Store location display
- Delivery zone visualization
- Address geocoding

## Production Deployment

```bash
# Build
npm run build

# The dist/ folder contains the production build
# Deploy to any static hosting (Vercel, Netlify, etc.)
```

### Environment for Production

```env
VITE_API_URL=https://api.yourdomain.com/api/v1
VITE_WS_URL=wss://api.yourdomain.com/ws
```

## Related Projects

- **server** - Django backend API
- **pastita-3d** - Customer-facing storefront (Next.js)

## License

Proprietary - All rights reserved
