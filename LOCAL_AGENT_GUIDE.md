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
import asyncio
import aiohttp
import platform
import time
import logging
from datetime import datetime
from dotenv import load_dotenv
import psutil

# Configuración de logs
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("agente_monitor.log"),
        logging.StreamHandler()
    ]
)

# Cargar variables .env
load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_ANON_KEY')

# Parámetros optimizados
CHECK_INTERVAL = 20  # segundos
MAX_CONCURRENT_PINGS = 30  # concurrencia ajustada
TIMEOUT = 8  # segundos
RETRIES = 2  # reintento inteligente

if not SUPABASE_URL or not SUPABASE_KEY:
    raise EnvironmentError("Variables SUPABASE_URL y SUPABASE_ANON_KEY no configuradas.")

HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

async def ejecutar_ping(ip_address, timeout):
    param = '-n' if platform.system().lower() == 'windows' else '-c'
    command = ['ping', param, '1', ip_address]
    start_time = time.time()
    try:
        proc = await asyncio.create_subprocess_exec(
            *command, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=timeout)
        end_time = time.time()
        output = stdout.decode(errors='ignore')
        logging.debug(f"Ping output for {ip_address}: {output.strip()}")

        if "TTL" in output.upper() or "bytes=" in output.lower():
            return {'status': 'online', 'response_time': int((end_time - start_time) * 1000)}
        else:
            return {'status': 'offline', 'response_time': None}
    except asyncio.TimeoutError:
        logging.warning(f"Timeout al hacer ping a {ip_address}")
        return {'status': 'timeout', 'response_time': None}
    except Exception as e:
        logging.error(f"Error ejecutando ping a {ip_address}: {e}")
        return {'status': 'error', 'response_time': None}

async def ping_ip(ip_address):
    for attempt in range(RETRIES):
        result = await ejecutar_ping(ip_address, TIMEOUT)
        if result['status'] == 'online':
            return result
    return {'status': 'offline', 'response_time': None}

async def get_devices(session):
    try:
        async with session.get(f'{SUPABASE_URL}/rest/v1/devices?select=*', headers=HEADERS) as response:
            response.raise_for_status()
            return await response.json()
    except Exception as e:
        logging.error(f"Error fetching devices: {e}")
        return []

async def update_device_status(session, device_id, status, response_time):
    device_update = {'status': status, 'response_time': response_time}
    if status == 'offline':
        device_update['last_down'] = datetime.utcnow().isoformat()
    try:
        async with session.patch(f'{SUPABASE_URL}/rest/v1/devices?id=eq.{device_id}', headers=HEADERS, json=device_update) as resp:
            resp.raise_for_status()
    except Exception as e:
        logging.error(f"Error updating device {device_id}: {e}")

    event_data = {'device_id': device_id, 'status': status, 'response_time': response_time}
    try:
        async with session.post(f'{SUPABASE_URL}/rest/v1/events', headers=HEADERS, json=event_data) as resp:
            resp.raise_for_status()
    except Exception as e:
        logging.error(f"Error creating event for device {device_id}: {e}")

async def monitor_loop():
    logging.info("Agente de monitoreo iniciado (modo asyncio)")
    logging.info(f"Intervalo: {CHECK_INTERVAL}s | Concurrencia máxima: {MAX_CONCURRENT_PINGS}")
    semaphore = asyncio.Semaphore(MAX_CONCURRENT_PINGS)

    async with aiohttp.ClientSession() as session:
        while True:
            start_cycle = time.time()
            try:
                devices = await get_devices(session)
                logging.info(f"Verificando {len(devices)} dispositivos...")
                timeout_count = 0

                async def process_device(device):
                    nonlocal timeout_count
                    async with semaphore:
                        result = await ping_ip(device['ip_address'])
                        if result['status'] == 'timeout':
                            timeout_count += 1
                        await update_device_status(session, device['id'], result['status'], result['response_time'])
                        logging.info(f"{device['name']} ({device['ip_address']}): {result['status']}")

                await asyncio.gather(*(process_device(d) for d in devices))

                # Métricas del sistema
                cpu_usage = psutil.cpu_percent(interval=None)
                ram_usage = psutil.virtual_memory().used / (1024 * 1024)  # MB
                cycle_time = round(time.time() - start_cycle, 2)
                logging.info(f"Métricas -> CPU: {cpu_usage}% | RAM: {ram_usage:.2f}MB | Tiempo ciclo: {cycle_time}s")
                logging.info(f"Timeouts en este ciclo: {timeout_count}")
                logging.info(f"Próxima verificación en {CHECK_INTERVAL}s...")
                await asyncio.sleep(CHECK_INTERVAL)
            except KeyboardInterrupt:
                logging.warning("Agente detenido por el usuario")
                break
            except Exception as e:
                logging.error(f"Error en el bucle: {e}")
                await asyncio.sleep(CHECK_INTERVAL)

if __name__ == '__main__':
    asyncio.run(monitor_loop())

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
