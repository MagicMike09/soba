-- Script simple de migration TTS/STT pour Supabase
-- Exécutez ces commandes une par une dans la console SQL Supabase

-- Ajouter les colonnes (ignorez les erreurs si elles existent déjà)
ALTER TABLE ai_config ADD COLUMN tts_voice VARCHAR(20) DEFAULT 'alloy';
ALTER TABLE ai_config ADD COLUMN tts_speed DECIMAL(3,2) DEFAULT 1.0;
ALTER TABLE ai_config ADD COLUMN stt_language VARCHAR(10) DEFAULT 'fr';
ALTER TABLE ai_config ADD COLUMN stt_model VARCHAR(20) DEFAULT 'whisper-1';

-- Mettre à jour les valeurs par défaut
UPDATE ai_config 
SET 
  tts_voice = 'alloy',
  tts_speed = 1.0,
  stt_language = 'fr',
  stt_model = 'whisper-1'
WHERE 
  tts_voice IS NULL 
  OR tts_speed IS NULL 
  OR stt_language IS NULL 
  OR stt_model IS NULL;