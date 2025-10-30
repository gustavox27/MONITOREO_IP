# Local Agent Guide - IP Monitoring System

This guide explains how to create and configure a local agent that will monitor your internal IP addresses and report their status to the centralized monitoring system.

## Overview

The local agent is a script that runs on your internal network and periodically:
1. Pings the configured IP addresses
2. Records response times
3. Sends status updates to the web application

## Agent Implementation

### Python Agent (Recommended)

Create a file called `monitor_agent.py`:

```python
#!/usr/bin/env python3
import os
import time
import subprocess
import platform
import requests
from datetime import datetime

# Configuration
SUPABASE_URL = os.getenv('SUPABASE_URL', 'https://wangyihjmrxdaajrbmuk.supabase.co')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY', 'your-anon-key-here')
CHECK_INTERVAL = 60  # seconds

def ping_ip(ip_address):
    """
    Ping an IP address and return status and response time
    """
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', ip_address]

    try:
        start_time = time.time()
        output = subprocess.check_output(command, stderr=subprocess.STDOUT, timeout=5)
        end_time = time.time()

        response_time = int((end_time - start_time) * 1000)  # Convert to milliseconds
        return {'status': 'online', 'response_time': response_time}
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return {'status': 'offline', 'response_time': None}

def get_devices():
    """
    Fetch all devices from the API
    """
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.get(
            f'{SUPABASE_URL}/rest/v1/devices?select=*',
            headers=headers
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        print(f"Error fetching devices: {e}")
        return []

def update_device_status(device_id, status, response_time):
    """
    Update device status and create event
    """
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
    }

    # Update device
    device_update = {
        'status': status,
        'response_time': response_time
    }

    if status == 'offline':
        device_update['last_down'] = datetime.utcnow().isoformat()

    try:
        response = requests.patch(
            f'{SUPABASE_URL}/rest/v1/devices?id=eq.{device_id}',
            headers=headers,
            json=device_update
        )
        response.raise_for_status()

        # Create event
        event_data = {
            'device_id': device_id,
            'status': status,
            'response_time': response_time
        }

        response = requests.post(
            f'{SUPABASE_URL}/rest/v1/events',
            headers=headers,
            json=event_data
        )
        response.raise_for_status()

        return True
    except Exception as e:
        print(f"Error updating device {device_id}: {e}")
        return False

def monitor_loop():
    """
    Main monitoring loop
    """
    print(f"Starting IP Monitor Agent")
    print(f"Check interval: {CHECK_INTERVAL} seconds")
    print(f"Supabase URL: {SUPABASE_URL}")
    print("-" * 50)

    while True:
        try:
            devices = get_devices()
            print(f"\n[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] Checking {len(devices)} devices...")

            for device in devices:
                ip = device['ip_address']
                device_id = device['id']
                name = device['name']

                print(f"  Checking {name} ({ip})...", end=' ')

                result = ping_ip(ip)
                update_device_status(device_id, result['status'], result['response_time'])

                if result['status'] == 'online':
                    print(f"✓ Online ({result['response_time']}ms)")
                else:
                    print(f"✗ Offline")

            print(f"\nNext check in {CHECK_INTERVAL} seconds...")
            time.sleep(CHECK_INTERVAL)

        except KeyboardInterrupt:
            print("\n\nAgent stopped by user")
            break
        except Exception as e:
            print(f"Error in monitoring loop: {e}")
            time.sleep(CHECK_INTERVAL)

if __name__ == '__main__':
    monitor_loop()
```

### Installation & Setup

1. **Install Python dependencies:**
```bash
pip install requests
```

2. **Set environment variables:**
```bash
export SUPABASE_URL="https://wangyihjmrxdaajrbmuk.supabase.co"
export SUPABASE_ANON_KEY="your-anon-key-here"
```

Or create a `.env` file:
```
SUPABASE_URL=https://wangyihjmrxdaajrbmuk.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

3. **Run the agent:**
```bash
python monitor_agent.py
```

### Running as a Service

#### Linux (systemd)

Create `/etc/systemd/system/ip-monitor.service`:

```ini
[Unit]
Description=IP Monitor Agent
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/agent
Environment="SUPABASE_URL=https://wangyihjmrxdaajrbmuk.supabase.co"
Environment="SUPABASE_ANON_KEY=your-anon-key-here"
ExecStart=/usr/bin/python3 /path/to/monitor_agent.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable ip-monitor
sudo systemctl start ip-monitor
sudo systemctl status ip-monitor
```

#### Windows (Task Scheduler)

1. Open Task Scheduler
2. Create a new task:
   - Name: "IP Monitor Agent"
   - Trigger: At system startup
   - Action: Start a program
   - Program: `python.exe`
   - Arguments: `C:\path\to\monitor_agent.py`
   - Start in: `C:\path\to\`

## Alternative: Node.js Agent

Create `monitor-agent.js`:

```javascript
const { exec } = require('child_process');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wangyihjmrxdaajrbmuk.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key-here';
const CHECK_INTERVAL = 60000; // milliseconds

function pingIp(ip) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const command = process.platform === 'win32' ? `ping -n 1 ${ip}` : `ping -c 1 ${ip}`;

    exec(command, (error) => {
      const responseTime = Date.now() - startTime;

      if (error) {
        resolve({ status: 'offline', response_time: null });
      } else {
        resolve({ status: 'online', response_time: responseTime });
      }
    });
  });
}

async function getDevices() {
  const url = new URL('/rest/v1/devices?select=*', SUPABASE_URL);

  const options = {
    method: 'GET',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function updateDeviceStatus(deviceId, status, responseTime) {
  const deviceUpdate = {
    status,
    response_time: responseTime
  };

  if (status === 'offline') {
    deviceUpdate.last_down = new Date().toISOString();
  }

  // Update device and create event
  // Implementation similar to Python version
}

async function monitorLoop() {
  console.log('Starting IP Monitor Agent');
  console.log(`Check interval: ${CHECK_INTERVAL / 1000} seconds`);
  console.log('-'.repeat(50));

  setInterval(async () => {
    try {
      const devices = await getDevices();
      console.log(`\n[${new Date().toISOString()}] Checking ${devices.length} devices...`);

      for (const device of devices) {
        const result = await pingIp(device.ip_address);
        await updateDeviceStatus(device.id, result.status, result.response_time);

        console.log(`  ${device.name} (${device.ip_address}): ${result.status}`);
      }
    } catch (error) {
      console.error('Error in monitoring loop:', error);
    }
  }, CHECK_INTERVAL);
}

monitorLoop();
```

## Configuration Options

You can customize the agent behavior:

- `CHECK_INTERVAL`: How often to check devices (in seconds for Python, milliseconds for Node.js)
- `TIMEOUT`: Ping timeout duration
- `RETRY_COUNT`: Number of retries before marking as offline

## Security Considerations

1. **Use Service Role Key for Production**: The anon key has limited permissions. For a production agent, consider using the service role key with proper network restrictions.

2. **Secure Storage**: Store API keys securely using environment variables or a secrets manager.

3. **Network Security**: Run the agent on a secure internal network. Use VPN if accessing from external networks.

4. **HTTPS Only**: Always use HTTPS for API communications.

## Troubleshooting

### Agent can't connect to Supabase
- Check your internet connection
- Verify the SUPABASE_URL and SUPABASE_KEY
- Check firewall settings

### Pings always fail
- Verify the target IPs are accessible from the agent's network
- Some devices may have ICMP disabled
- Check network permissions

### Status not updating in web app
- Verify authentication is working
- Check browser console for errors
- Ensure RLS policies are correctly configured

## API Endpoints Reference

The agent interacts with these endpoints:

- `GET /rest/v1/devices` - Fetch all devices
- `PATCH /rest/v1/devices?id=eq.{id}` - Update device status
- `POST /rest/v1/events` - Create event record

All requests require:
```
apikey: YOUR_SUPABASE_ANON_KEY
Authorization: Bearer YOUR_SUPABASE_ANON_KEY
Content-Type: application/json
```
