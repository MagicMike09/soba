-- Script de migration pour ajouter les champs TTS et STT à la table ai_config
-- ⚠️ IMPORTANT: Exécutez ce script dans votre console Supabase SQL

-- 1. Ajouter les colonnes TTS/STT si elles n'existent pas
DO $$
BEGIN
    -- Ajouter tts_voice
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ai_config' AND column_name = 'tts_voice') THEN
        ALTER TABLE ai_config ADD COLUMN tts_voice VARCHAR(20) DEFAULT 'alloy';
        RAISE NOTICE 'Colonne tts_voice ajoutée';
    ELSE
        RAISE NOTICE 'Colonne tts_voice existe déjà';
    END IF;

    -- Ajouter tts_speed
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ai_config' AND column_name = 'tts_speed') THEN
        ALTER TABLE ai_config ADD COLUMN tts_speed DECIMAL(3,2) DEFAULT 1.0;
        RAISE NOTICE 'Colonne tts_speed ajoutée';
    ELSE
        RAISE NOTICE 'Colonne tts_speed existe déjà';
    END IF;

    -- Ajouter stt_language
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ai_config' AND column_name = 'stt_language') THEN
        ALTER TABLE ai_config ADD COLUMN stt_language VARCHAR(10) DEFAULT 'fr';
        RAISE NOTICE 'Colonne stt_language ajoutée';
    ELSE
        RAISE NOTICE 'Colonne stt_language existe déjà';
    END IF;

    -- Ajouter stt_model
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'ai_config' AND column_name = 'stt_model') THEN
        ALTER TABLE ai_config ADD COLUMN stt_model VARCHAR(20) DEFAULT 'whisper-1';
        RAISE NOTICE 'Colonne stt_model ajoutée';
    ELSE
        RAISE NOTICE 'Colonne stt_model existe déjà';
    END IF;
END $$;

-- 2. Mettre à jour les enregistrements existants avec les valeurs par défaut
UPDATE ai_config 
SET 
  tts_voice = COALESCE(tts_voice, 'alloy'),
  tts_speed = COALESCE(tts_speed, 1.0),
  stt_language = COALESCE(stt_language, 'fr'),
  stt_model = COALESCE(stt_model, 'whisper-1');

-- 3. Vérifier que les colonnes ont été créées
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'ai_config' 
  AND column_name IN ('tts_voice', 'tts_speed', 'stt_language', 'stt_model')
ORDER BY column_name;

-- 4. Afficher le contenu actuel pour vérification
SELECT id, tts_voice, tts_speed, stt_language, stt_model FROM ai_config;