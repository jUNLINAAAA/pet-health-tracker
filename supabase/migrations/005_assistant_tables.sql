-- ============================================================================
-- ASSISTANT TABLES
-- For AI-powered pet health assistant with RAG capabilities
-- ============================================================================

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================================
-- 1. ASSISTANT EMBEDDINGS TABLE
-- Stores vector embeddings for RAG context retrieval
-- ============================================================================
CREATE TABLE IF NOT EXISTS assistant_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- OpenAI text-embedding-3-small dimension
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for assistant_embeddings
CREATE INDEX IF NOT EXISTS idx_assistant_embeddings_user_id ON assistant_embeddings(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_embeddings_pet_id ON assistant_embeddings(pet_id);
CREATE INDEX IF NOT EXISTS idx_assistant_embeddings_embedding ON assistant_embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================================
-- 2. ASSISTANT MESSAGES TABLE
-- Stores conversation history for context and audit
-- ============================================================================
CREATE TABLE IF NOT EXISTS assistant_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id UUID REFERENCES pets(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for assistant_messages
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_id ON assistant_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_pet_id ON assistant_messages(pet_id);
CREATE INDEX IF NOT EXISTS idx_assistant_messages_created_at ON assistant_messages(created_at DESC);

-- ============================================================================
-- 3. RLS POLICIES
-- ============================================================================

-- Enable RLS on both tables
ALTER TABLE assistant_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;

-- Embeddings: Users can only access their own embeddings
CREATE POLICY "Users can view their own embeddings"
ON assistant_embeddings FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own embeddings"
ON assistant_embeddings FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own embeddings"
ON assistant_embeddings FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own embeddings"
ON assistant_embeddings FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Messages: Users can only access their own messages
CREATE POLICY "Users can view their own messages"
ON assistant_messages FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own messages"
ON assistant_messages FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own messages"
ON assistant_messages FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================================================
-- 4. HELPER FUNCTIONS
-- ============================================================================

-- Function to search embeddings by similarity
CREATE OR REPLACE FUNCTION match_embeddings(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 5,
  p_user_id uuid DEFAULT auth.uid(),
  p_pet_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id,
    ae.content,
    ae.metadata,
    1 - (ae.embedding <=> query_embedding) as similarity
  FROM assistant_embeddings ae
  WHERE ae.user_id = p_user_id
    AND (p_pet_id IS NULL OR ae.pet_id = p_pet_id)
    AND 1 - (ae.embedding <=> query_embedding) > match_threshold
  ORDER BY ae.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION match_embeddings(vector(1536), float, int, uuid, uuid) TO authenticated;

-- Function to get recent messages for context
CREATE OR REPLACE FUNCTION get_recent_messages(
  p_user_id uuid DEFAULT auth.uid(),
  p_pet_id uuid DEFAULT NULL,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  role text,
  content text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT am.role, am.content, am.created_at
  FROM assistant_messages am
  WHERE am.user_id = p_user_id
    AND (p_pet_id IS NULL OR am.pet_id = p_pet_id)
  ORDER BY am.created_at DESC
  LIMIT p_limit;
END;
$$;

GRANT EXECUTE ON FUNCTION get_recent_messages(uuid, uuid, int) TO authenticated;

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Auto-update updated_at on embeddings
CREATE OR REPLACE FUNCTION update_assistant_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_assistant_embeddings_timestamp ON assistant_embeddings;
CREATE TRIGGER update_assistant_embeddings_timestamp
  BEFORE UPDATE ON assistant_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_assistant_embeddings_updated_at();
