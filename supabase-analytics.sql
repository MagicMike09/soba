-- Table pour stocker les analytics des conversations
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Métadonnées conversation
    session_id VARCHAR(255),
    user_id VARCHAR(255),
    user_location JSONB,
    
    -- Métriques conversation
    duration_seconds INTEGER DEFAULT 0,
    message_count INTEGER DEFAULT 0,
    
    -- Métriques tokens et coûts
    token_count INTEGER DEFAULT 0,
    input_tokens INTEGER DEFAULT 0,
    output_tokens INTEGER DEFAULT 0,
    cost_usd DECIMAL(10,4) DEFAULT 0,
    
    -- Modèle utilisé
    llm_model VARCHAR(100),
    
    -- Statut conversation
    status VARCHAR(50) DEFAULT 'active', -- active, completed, error
    
    -- Données conversation
    messages JSONB,
    conversation_summary TEXT,
    
    -- Email envoyé
    advisor_contacted BOOLEAN DEFAULT false,
    advisor_email VARCHAR(255),
    
    CONSTRAINT conversations_status_check CHECK (status IN ('active', 'completed', 'error'))
);

-- Index pour optimiser les requêtes analytics
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);

-- RLS (Row Level Security) - optionnel
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre toutes les opérations (à ajuster selon vos besoins)
CREATE POLICY "Allow all operations on conversations" ON conversations
    FOR ALL USING (true) WITH CHECK (true);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();