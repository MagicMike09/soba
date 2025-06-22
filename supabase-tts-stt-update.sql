-- Mettre à jour la table ai_config avec les nouveaux champs TTS et STT
-- Ajouter les colonnes si elles n'existent pas déjà

ALTER TABLE ai_config 
ADD COLUMN IF NOT EXISTS tts_voice VARCHAR(20) DEFAULT 'alloy';

ALTER TABLE ai_config 
ADD COLUMN IF NOT EXISTS tts_speed DECIMAL(3,2) DEFAULT 1.0;

ALTER TABLE ai_config 
ADD COLUMN IF NOT EXISTS stt_language VARCHAR(10) DEFAULT 'fr';

ALTER TABLE ai_config 
ADD COLUMN IF NOT EXISTS stt_model VARCHAR(20) DEFAULT 'whisper-1';

-- Mettre à jour les enregistrements existants avec les valeurs par défaut
UPDATE ai_config 
SET 
  tts_voice = COALESCE(tts_voice, 'alloy'),
  tts_speed = COALESCE(tts_speed, 1.0),
  stt_language = COALESCE(stt_language, 'fr'),
  stt_model = COALESCE(stt_model, 'whisper-1')
WHERE 
  tts_voice IS NULL 
  OR tts_speed IS NULL 
  OR stt_language IS NULL 
  OR stt_model IS NULL;

-- Ajouter des commentaires pour documentation
COMMENT ON COLUMN ai_config.tts_voice IS 'Voix OpenAI pour TTS: alloy, echo, fable, onyx, nova, shimmer';
COMMENT ON COLUMN ai_config.tts_speed IS 'Vitesse de lecture TTS (0.25 à 4.0)';
COMMENT ON COLUMN ai_config.stt_language IS 'Langue pour STT: fr, en, es, de, it, pt, auto';
COMMENT ON COLUMN ai_config.stt_model IS 'Modèle Whisper pour STT: whisper-1';