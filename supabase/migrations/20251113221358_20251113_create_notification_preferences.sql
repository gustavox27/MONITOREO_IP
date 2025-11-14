/*
  # Create notification preferences table

  1. New Tables
    - `notification_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `enable_notifications` (boolean, default true)
      - `enable_sound` (boolean, default true)
      - `group_notifications` (boolean, default true)
      - `sound_volume` (numeric, default 0.4)
      - `notification_duration` (integer, default 10000ms)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on `notification_preferences` table
    - Add policies for users to read/write their own preferences

  3. Note
    - Each user can have one preferences record
    - All fields have sensible defaults for professional use
*/

CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enable_notifications boolean DEFAULT true NOT NULL,
  enable_sound boolean DEFAULT true NOT NULL,
  group_notifications boolean DEFAULT true NOT NULL,
  sound_volume numeric DEFAULT 0.4 NOT NULL CHECK (sound_volume >= 0 AND sound_volume <= 1),
  notification_duration integer DEFAULT 10000 NOT NULL CHECK (notification_duration >= 1000 AND notification_duration <= 60000),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences"
  ON notification_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own notification preferences"
  ON notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences"
  ON notification_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users cannot delete their notification preferences"
  ON notification_preferences
  FOR DELETE
  TO authenticated
  USING (false);

CREATE INDEX idx_notification_preferences_user_id ON notification_preferences(user_id);
