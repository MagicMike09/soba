-- Ajouter la colonne tts_voice à la table ai_config
ALTER TABLE ai_config 
ADD COLUMN IF NOT EXISTS tts_voice VARCHAR(20) DEFAULT 'alloy';

-- Mettre à jour les enregistrements existants avec la voix par défaut
UPDATE ai_config 
SET tts_voice = 'alloy' 
WHERE tts_voice IS NULL;