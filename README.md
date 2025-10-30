# IP Monitoring System

A professional multi-user web application for monitoring internal IP addresses with real-time status tracking, event history, and role-based access control.

## Features

### Core Functionality
- **Real-time IP Monitoring**: Track status (online/offline), response times, and downtime
- **Device Management**: Full CRUD operations for IP devices
- **Event History**: Complete audit trail of all status changes with timestamps
- **Multi-User Support**: Secure authentication with role-based access control
- **Responsive Dashboard**: Professional UI with dynamic status indicators

### User Roles
- **Technician**: Manages and views only their assigned devices
- **Administrator**: Views all devices with filtering by technician

### Security
- Email/password authentication via Supabase Auth
- Row Level Security (RLS) policies for data isolation
- IP address validation
- Secure API communications

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Backend**: Supabase (PostgreSQL + Authentication + RLS)
- **Database**: PostgreSQL with automatic triggers

## Getting Started

### 1. Database Setup

Execute the SQL migration in your Supabase SQL Editor:

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Open `supabase-migration.sql`
4. Execute the entire script

This will create:
- `profiles` table for user management
- `devices` table for IP tracking
- `events` table for history logging
- All necessary RLS policies
- Automatic triggers for profile creation

### 2. Environment Configuration

Your `.env` file is already configured with:
```
VITE_SUPABASE_URL=https://wangyihjmrxdaajrbmuk.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 5. Create Your First User

1. Navigate to `/register`
2. Create an account (first user will be a technician)
3. To make a user an admin, update their role in the database:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
```

## Local Agent Setup

To monitor your internal IPs, you need to run a local agent on your network. See `LOCAL_AGENT_GUIDE.md` for:

- Python agent implementation (recommended)
- Node.js agent implementation
- Running as a system service
- Configuration options
- Troubleshooting

Quick start:
```bash
# Install dependencies
pip install requests

# Set environment variables
export SUPABASE_URL="https://wangyihjmrxdaajrbmuk.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key"

# Run the agent
python monitor_agent.py
```

## Application Structure

```
src/
├── components/
│   ├── AuthPages.tsx       # Login and registration pages
│   ├── Dashboard.tsx       # Main dashboard with device table
│   ├── DeviceForm.tsx      # Add/edit device modal
│   └── HistoryModal.tsx    # Event history viewer
├── contexts/
│   └── AuthContext.tsx     # Authentication state management
├── services/
│   └── deviceService.ts    # API operations for devices/events
├── lib/
│   ├── supabase.ts         # Supabase client configuration
│   └── database.types.ts   # TypeScript types for database
└── App.tsx                 # Main application component
```

## API Operations

The application provides these operations:

### Devices
- `GET /devices` - List all devices (filtered by user role)
- `POST /devices` - Create new device
- `PUT /devices/:id` - Update device
- `DELETE /devices/:id` - Delete device

### Events
- `GET /events?device_id=:id` - Get device event history
- `POST /events` - Record new event (used by agent)

### Authentication
- `POST /auth/signup` - Register new user
- `POST /auth/signin` - User login
- `POST /auth/signout` - User logout

## Database Schema

### profiles
- User information and role assignment
- Linked to Supabase auth.users

### devices
- IP addresses to monitor
- Current status and response times
- Owner/technician assignment

### events
- Historical log of all status changes
- Timestamps and response time tracking

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Type checking
npm run typecheck

# Preview production build
npm run preview
```

## Security Notes

1. **Row Level Security**: All tables use RLS to ensure users only see their own data
2. **IP Validation**: Client-side and server-side validation of IP addresses
3. **Authentication Required**: All operations require valid authentication
4. **Secure by Default**: Technicians can only manage their own devices

## Production Deployment

1. Build the application:
```bash
npm run build
```

2. Deploy the `dist` folder to your hosting provider (Vercel, Netlify, etc.)

3. Set up the local agent on your internal network as a service

4. Configure environment variables on your hosting platform

## Troubleshooting

### Database Connection Issues
- Verify Supabase URL and API key in `.env`
- Check that migration was executed successfully
- Ensure RLS policies are enabled

### Agent Not Updating Status
- Verify agent has correct Supabase credentials
- Check network connectivity between agent and targets
- Review agent logs for errors

### Authentication Problems
- Clear browser cache and cookies
- Verify email confirmation is disabled in Supabase Auth settings
- Check browser console for errors

## Future Enhancements

Potential features for future development:
- Email/SMS alerts for downtime
- Uptime statistics and reporting
- Multiple check types (HTTP, TCP, etc.)
- Custom check intervals per device
- Mobile app for monitoring
- Webhooks for third-party integrations

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review `LOCAL_AGENT_GUIDE.md` for agent setup
3. Verify database migration was successful
4. Check browser console and network tab for errors

## License

MIT License - Feel free to use this project for personal or commercial purposes.
