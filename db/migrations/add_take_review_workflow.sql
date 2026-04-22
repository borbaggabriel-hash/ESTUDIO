-- Migration: Add Take Review Workflow
-- Adiciona campos para workflow de aprovação de takes pelo diretor
-- Data: 2026-03-30

-- Adicionar colunas à tabela takes
ALTER TABLE takes
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS director_feedback TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by VARCHAR REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS take_number INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_final BOOLEAN DEFAULT FALSE;

-- Criar índices para queries eficientes
CREATE INDEX IF NOT EXISTS takes_status_idx ON takes(status);
CREATE INDEX IF NOT EXISTS takes_reviewed_by_idx ON takes(reviewed_by);
CREATE INDEX IF NOT EXISTS takes_session_status_idx ON takes(session_id, status);

-- Constraint para garantir status válidos
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'takes_status_check'
  ) THEN
    ALTER TABLE takes
      ADD CONSTRAINT takes_status_check 
      CHECK (status IN ('pending', 'approved', 'rejected', 'superseded'));
  END IF;
END $$;

-- Comentários para documentação
COMMENT ON COLUMN takes.status IS 'Status do take: pending (aguardando revisão), approved (aprovado), rejected (rejeitado), superseded (substituído por versão final)';
COMMENT ON COLUMN takes.director_feedback IS 'Feedback do diretor sobre o take';
COMMENT ON COLUMN takes.reviewed_by IS 'ID do usuário (diretor) que revisou o take';
COMMENT ON COLUMN takes.reviewed_at IS 'Timestamp da revisão';
COMMENT ON COLUMN takes.take_number IS 'Número sequencial do take para a mesma linha';
COMMENT ON COLUMN takes.is_final IS 'Indica se este é o take final aprovado para a linha';
