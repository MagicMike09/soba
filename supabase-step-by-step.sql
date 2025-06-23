-- Migration étape par étape pour Supabase
-- Copiez et exécutez ces commandes UNE PAR UNE dans l'éditeur SQL Supabase

-- Étape 1: Ajouter tts_voice
ALTER TABLE ai_config ADD COLUMN tts_voice VARCHAR(20) DEFAULT 'alloy';

-- Étape 2: Ajouter tts_speed  
ALTER TABLE ai_config ADD COLUMN tts_speed DECIMAL(3,2) DEFAULT 1.0;

-- Étape 3: Ajouter stt_language
ALTER TABLE ai_config ADD COLUMN stt_language VARCHAR(10) DEFAULT 'fr';

-- Étape 4: Ajouter stt_model
ALTER TABLE ai_config ADD COLUMN stt_model VARCHAR(20) DEFAULT 'whisper-1';

-- Étape 5: Vérifier (optionnel)
SELECT * FROM ai_config LIMIT 1;