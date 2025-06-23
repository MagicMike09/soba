-- Script de migration compatible Supabase
-- Exécutez ces commandes une par une dans l'éditeur SQL Supabase

-- 1. Ajouter la colonne tts_voice
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_config' AND column_name = 'tts_voice'
    ) THEN
        ALTER TABLE ai_config ADD COLUMN tts_voice VARCHAR(20) DEFAULT 'alloy';
    END IF;
END $$;

-- 2. Ajouter la colonne tts_speed
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_config' AND column_name = 'tts_speed'
    ) THEN
        ALTER TABLE ai_config ADD COLUMN tts_speed DECIMAL(3,2) DEFAULT 1.0;
    END IF;
END $$;

-- 3. Ajouter la colonne stt_language
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_config' AND column_name = 'stt_language'
    ) THEN
        ALTER TABLE ai_config ADD COLUMN stt_language VARCHAR(10) DEFAULT 'fr';
    END IF;
END $$;

-- 4. Ajouter la colonne stt_model
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'ai_config' AND column_name = 'stt_model'
    ) THEN
        ALTER TABLE ai_config ADD COLUMN stt_model VARCHAR(20) DEFAULT 'whisper-1';
    END IF;
END $$;

-- 5. Mettre à jour les valeurs par défaut
UPDATE ai_config 
SET 
  tts_voice = COALESCE(tts_voice, 'alloy'),
  tts_speed = COALESCE(tts_speed, 1.0),
  stt_language = COALESCE(stt_language, 'fr'),
  stt_model = COALESCE(stt_model, 'whisper-1');

-- 6. Vérifier les colonnes ajoutées
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'ai_config' 
  AND column_name IN ('tts_voice', 'tts_speed', 'stt_language', 'stt_model');