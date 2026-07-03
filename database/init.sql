CREATE TABLE IF NOT EXISTS sistema_info (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    version VARCHAR(20) NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO sistema_info (nombre, version)
VALUES ('EduCloudERP', '0.1.0');
