-- CreateBankCardTable
CREATE TABLE bank_cards (
  id VARCHAR(50) PRIMARY KEY,
  provider_id VARCHAR(50) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  bank_code VARCHAR(20) NOT NULL,
  card_number VARCHAR(255) NOT NULL, -- 加密存储
  masked_card_number VARCHAR(25) NOT NULL,
  card_holder VARCHAR(50) NOT NULL,
  card_type ENUM('DEBIT', 'CREDIT') NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  status ENUM('ACTIVE', 'FROZEN', 'EXPIRED') DEFAULT 'ACTIVE',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  last_used_at TIMESTAMP NULL,
  INDEX idx_provider_id (provider_id),
  INDEX idx_default (provider_id, is_default),
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE
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
  bank_info JSON NOT NULL,
  status ENUM('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED') DEFAULT 'PENDING',
  failure_reason TEXT NULL,
  processed_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  estimated_arrival VARCHAR(50) NOT NULL DEFAULT '1-3个工作日',
  remark TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_provider_id (provider_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (provider_id) REFERENCES providers(id) ON DELETE CASCADE,
  FOREIGN KEY (bank_card_id) REFERENCES bank_cards(id) ON DELETE RESTRICT
);

-- 为现有withdrawal表添加新字段以保持兼容性
ALTER TABLE withdrawals 
ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS actual_amount DECIMAL(10,2) GENERATED ALWAYS AS (amount - fee) STORED,
ADD COLUMN IF NOT EXISTS bank_card_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS failure_reason TEXT,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS estimated_arrival VARCHAR(50) DEFAULT '1-3个工作日',
ADD COLUMN IF NOT EXISTS remark TEXT;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_withdrawals_provider_id ON withdrawals(provider_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at);
