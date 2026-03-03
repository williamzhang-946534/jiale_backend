-- CreateBankCardTable
CREATE TABLE bank_cards (
  id VARCHAR(50) PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  card_number VARCHAR(255) NOT NULL, -- 加密存储
  masked_card_number VARCHAR(25) NOT NULL,
  card_holder VARCHAR(50) NOT NULL,
  card_type VARCHAR(10) NOT NULL CHECK (card_type IN ('DEBIT', 'CREDIT')),
  is_default BOOLEAN DEFAULT FALSE,
  status VARCHAR(10) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'FROZEN', 'EXPIRED')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL
);

-- CreateWithdrawalRecordsTable (新表，与现有withdrawal表并存)
CREATE TABLE withdrawal_records (
  id VARCHAR(50) PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL,
  order_id VARCHAR(50) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  actual_amount DECIMAL(10,2) NOT NULL,
  bank_card_id VARCHAR(50) NOT NULL,
  bank_info JSONB NOT NULL,
  status VARCHAR(15) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  failure_reason TEXT NULL,
  processed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  estimated_arrival VARCHAR(50) NOT NULL DEFAULT '1-3个工作日',
  remark TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX idx_bank_cards_provider_id ON bank_cards(provider_id);
CREATE INDEX idx_bank_cards_default ON bank_cards(provider_id, is_default);
CREATE INDEX idx_withdrawal_records_provider_id ON withdrawal_records(provider_id);
CREATE INDEX idx_withdrawal_records_status ON withdrawal_records(status);
CREATE INDEX idx_withdrawal_records_created_at ON withdrawal_records(created_at);

-- 为现有withdrawal表添加新字段以保持兼容性（PostgreSQL语法）
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS actual_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount - fee) STORED;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS bank_card_id VARCHAR(50);
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS failure_reason TEXT;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS estimated_arrival VARCHAR(50) DEFAULT '1-3个工作日';
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS remark TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_id ON withdrawals(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);

-- 添加外键约束
ALTER TABLE bank_cards ADD CONSTRAINT fk_bank_cards_provider_id 
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

ALTER TABLE withdrawal_records ADD CONSTRAINT fk_withdrawal_records_provider_id 
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE;

ALTER TABLE withdrawal_records ADD CONSTRAINT fk_withdrawal_records_bank_card_id 
  FOREIGN KEY (bank_card_id) REFERENCES bank_cards(id) ON DELETE RESTRICT;
