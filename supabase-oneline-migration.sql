-- Script SQL en une ligne pour activer TTS/STT
-- Copiez-collez cette ligne dans Supabase SQL Editor :

ALTER TABLE ai_config ADD COLUMN IF NOT EXISTS tts_voice VARCHAR(20) DEFAULT 'alloy', ADD COLUMN IF NOT EXISTS tts_speed DECIMAL(3,2) DEFAULT 1.0, ADD COLUMN IF NOT EXISTS stt_language VARCHAR(10) DEFAULT 'fr', ADD COLUMN IF NOT EXISTS stt_model VARCHAR(20) DEFAULT 'whisper-1';