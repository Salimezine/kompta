INSERT OR IGNORE INTO companies (id, nom, matricule_fiscal) VALUES ('COMP-1', 'ComptaFlow Test', '1234567/A/A/M000');
INSERT OR IGNORE INTO users (id, company_id, nom, email, password_hash) VALUES ('USER-1', 'COMP-1', 'Admin Test', 'admin@test.com', 'hash_test');
