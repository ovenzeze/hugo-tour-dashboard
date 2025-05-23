# Authentication System Setup

## Overview

I have implemented a simple password-based authentication system for the Hugo Tour Dashboard. This system uses hardcoded credentials stored in environment variables for secure access.

## Default Credentials

**Email:** `admin@hugoapp.com`  
**Password:** `Hugo2024!`

## Environment Variables

Add these variables to your `.env` file:

```env
# Authentication - Simple Password-based Login
AUTH_ADMIN_EMAIL="admin@hugoapp.com"
AUTH_ADMIN_PASSWORD="Hugo2024!"
```

## How It Works

### 1. Login Process
- Users access `/auth/login` page
- Enter email and password
- System verifies credentials against environment variables
- On success, creates a base64-encoded token with user info and timestamp
- Sets secure httpOnly cookie (`auth-token`) valid for 7 days
- Redirects to intended page or dashboard

### 2. Authentication Protection
- **Global Middleware:** `middleware/auth.global.ts` protects all pages except login
- **Client Plugin:** `plugins/auth.client.ts` checks auth status on app initialization
- **Token Verification:** Server validates tokens and checks expiration

### 3. API Endpoints
- `POST /api/auth/login` - Authenticate user
- `POST /api/auth/verify` - Verify token validity  
- `POST /api/auth/logout` - Clear authentication cookie

### 4. State Management
- **Pinia Store:** `stores/auth.ts` manages authentication state
- **Persistence:** Uses localStorage for client-side token storage
- **Security:** httpOnly cookies for server-side security

## Features

- ✅ **Secure Authentication:** httpOnly cookies + localStorage
- ✅ **Token Expiration:** 7-day automatic expiry
- ✅ **Auto-redirect:** Preserves intended destination
- ✅ **Global Protection:** All pages protected except login
- ✅ **Logout Functionality:** Complete session cleanup
- ✅ **User Interface:** Login form + sidebar user menu

## Usage

1. Start the development server
2. Navigate to any protected page
3. You'll be redirected to `/auth/login`
4. Enter the credentials above
5. You'll be logged in and redirected to your intended page

## Security Notes

- Change default credentials in production
- Tokens are base64-encoded (use proper JWT in production)
- httpOnly cookies prevent XSS attacks
- 7-day expiration limits token lifetime
- Environment variables keep credentials secure

## Customization

To change credentials, update these environment variables:
- `AUTH_ADMIN_EMAIL` - Admin email address
- `AUTH_ADMIN_PASSWORD` - Admin password

## Files Modified/Created

### API Endpoints
- `server/api/auth/login.post.ts` - Login endpoint
- `server/api/auth/verify.post.ts` - Token verification
- `server/api/auth/logout.post.ts` - Logout endpoint

### Frontend
- `pages/auth/login.vue` - Login page (English)
- `middleware/auth.global.ts` - Global authentication middleware
- `plugins/auth.client.ts` - Client-side auth initialization
- `stores/auth.ts` - Updated authentication store
- `components/layout/SidebarNav.vue` - User menu with logout

### Removed
- `pages/auth/register.vue` - Registration not needed
- `pages/auth/forgot-password.vue` - Password reset not needed  
- `pages/auth/change-password.vue` - Password change not needed
- `pages/auth/reset-password/[token].vue` - Password reset not needed 