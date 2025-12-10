/*
  # Add Device Registration Event Tracking

  1. New Columns
    - `devices.device_registered_at` - Timestamp when device monitoring was first added
    - `events.is_device_registration` - Boolean flag marking the actual initial device registration event
    - `events.is_state_transition` - Boolean flag to differentiate state transitions from registration events

  2. Purpose
    - Track when a device was first added to monitoring
    - Mark the true initial registration event (only one per device)
    - Differentiate between the device registration event and subsequent state changes
    - Fix "Última Caída" to track first event of each state instead of just last_down

  3. Data Migration
    - Set device_registered_at to the device's created_at timestamp for existing devices
    - Mark the first event for each device as is_device_registration = true
    - Mark all other events as is_device_registration = false
    - All events are state transitions by default

  4. Security
    - No RLS policy changes needed
    - These fields are informational only
*/

-- Add device_registered_at to devices table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'devices' AND column_name = 'device_registered_at'
  ) THEN
    ALTER TABLE devices ADD COLUMN device_registered_at timestamptz DEFAULT now();
    -- Set to created_at for existing devices
    UPDATE devices SET device_registered_at = created_at WHERE device_registered_at = now();
  END IF;
END $$;

-- Add event tracking columns to events table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'is_device_registration'
  ) THEN
    ALTER TABLE events ADD COLUMN is_device_registration boolean DEFAULT false NOT NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'events' AND column_name = 'is_state_transition'
  ) THEN
    ALTER TABLE events ADD COLUMN is_state_transition boolean DEFAULT true NOT NULL;
  END IF;
END $$;

-- Mark the first event for each device as device registration
DO $$
DECLARE
  v_device_id uuid;
  v_first_event_id uuid;
BEGIN
  FOR v_device_id IN
    SELECT DISTINCT device_id FROM events
  LOOP
    SELECT id INTO v_first_event_id
    FROM events
    WHERE device_id = v_device_id
    ORDER BY timestamp ASC
    LIMIT 1;
    
    IF v_first_event_id IS NOT NULL THEN
      UPDATE events
      SET is_device_registration = true
      WHERE id = v_first_event_id AND device_id = v_device_id;
    END IF;
  END LOOP;
END $$;