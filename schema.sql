-- schema.sql
-- Base de données D1 pour ComptaFlow

DROP TABLE IF EXISTS alertes_fiscales;
DROP TABLE IF EXISTS declarations_fiscales;
DROP TABLE IF EXISTS ecritures_comptables;
DROP TABLE IF EXISTS documents;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS companies;

CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    nom TEXT NOT NULL,
    matricule_fiscal TEXT,
    rne TEXT,
    rc TEXT,
    regime_tva TEXT CHECK(regime_tva IN ('mensuel', 'trimestriel')),
    regime_is TEXT CHECK(regime_is IN ('15%', '25%')),
    secteur TEXT,
    adresse TEXT,
    pays TEXT,
    plan TEXT CHECK(plan IN ('starter', 'pro', 'enterprise')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'comptable', 'viewer')) DEFAULT 'viewer',
    langue TEXT CHECK(langue IN ('fr', 'ar', 'en')) DEFAULT 'fr',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE documents (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_url TEXT NOT NULL, -- Clé dans R2
    contexte TEXT CHECK(contexte IN ('tunisie', 'international')),
    type_document TEXT,
    statut TEXT DEFAULT 'en_attente',
    extracted_data TEXT, -- JSON
    ecritures_generees TEXT, -- JSON
    validated_by TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (validated_by) REFERENCES users(id)
);

CREATE TABLE ecritures_comptables (
    id TEXT PRIMARY KEY,
    document_id TEXT NOT NULL,
    date DATE NOT NULL,
    journal TEXT CHECK(journal IN ('ACH', 'VTE', 'BQ', 'OD', 'CAI')) NOT NULL,
    compte TEXT NOT NULL,
    libelle TEXT NOT NULL,
    debit REAL DEFAULT 0,
    credit REAL DEFAULT 0,
    devise TEXT DEFAULT 'TND',
    lettrage TEXT,
    periode TEXT NOT NULL, -- YYYY-MM
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);

CREATE TABLE declarations_fiscales (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    type TEXT NOT NULL, -- TVA, RAS, IS...
    periode TEXT NOT NULL, -- YYYY-MM
    montant_base REAL DEFAULT 0,
    montant_taxe REAL DEFAULT 0,
    statut TEXT CHECK(statut IN ('brouillon', 'soumis', 'paye')) DEFAULT 'brouillon',
    document_r2_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);

CREATE TABLE alertes_fiscales (
    id TEXT PRIMARY KEY,
    company_id TEXT NOT NULL,
    type TEXT NOT NULL,
    echeance DATE NOT NULL,
    statut TEXT CHECK(statut IN ('active', 'resolue')) DEFAULT 'active',
    message TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE CASCADE
);
