-- EXTENSION PARA UUID (opcional, muy útil si quieres usar UUID en el futuro)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- Tabla de ubicaciones
CREATE TABLE IF NOT EXISTS ubicacion (
    id_ubicacion SERIAL PRIMARY KEY,
    latitud DOUBLE PRECISION,
    longitud DOUBLE PRECISION,
    calle VARCHAR(100),
    numero VARCHAR(50),
    colonia VARCHAR(100),
    alcaldia VARCHAR(100),
    estado VARCHAR(100),
    codigo_postal VARCHAR(10),
    descripcion TEXT
);


-- Tabla de empresas (fabricantes)
CREATE TABLE IF NOT EXISTS empresa (
    id_empresa SERIAL PRIMARY KEY,
    nombre_empresa VARCHAR(100) UNIQUE NOT NULL
);

-- Tabla de agentes patógenos (solo aplica para vacunas, por ejemplo)
CREATE TABLE IF NOT EXISTS agente_patogeno (
    id_agente SERIAL PRIMARY KEY,
    nombre_agente VARCHAR(100) UNIQUE NOT NULL,
    tipo_agente VARCHAR(50) NOT NULL,  -- Ej.: 'Virus', 'Bacteria', 'Parásito', 'Hongo'
    descripcion TEXT,
    fecha_descubrimiento DATE
);

-- Tabla de especies animales
CREATE TABLE IF NOT EXISTS especie (
    id_especie SERIAL PRIMARY KEY,
    nombre_especie VARCHAR(50) UNIQUE NOT NULL  -- Ej.: 'Canino', 'Felino'
);

-- Tabla de medicamentos
CREATE TABLE IF NOT EXISTS medicamento (
    id_medicamento SERIAL PRIMARY KEY,
    nombre_medicamento VARCHAR(100) UNIQUE NOT NULL,
    tipo_medicamento VARCHAR(50) NOT NULL, -- 'Vacuna', 'Antiparasitario', 'Anestésico', etc.
    principio_activo VARCHAR(100),  -- Ej.: Alfaxalone
    via_administracion VARCHAR(100), -- Ej.: 'Intramuscular', 'Intravenosa'
    observaciones TEXT,
    id_empresa INT REFERENCES empresa(id_empresa)
);

-- Tabla intermedia: medicamento vs especie
CREATE TABLE IF NOT EXISTS medicamento_especie (
    id_medicamento INT REFERENCES medicamento(id_medicamento) ON DELETE CASCADE,
    id_especie INT REFERENCES especie(id_especie) ON DELETE CASCADE,
    PRIMARY KEY (id_medicamento, id_especie)
);

-- Tabla intermedia: medicamento vs agente (cuando aplica)
CREATE TABLE IF NOT EXISTS medicamento_agente (
    id_medicamento INT REFERENCES medicamento(id_medicamento) ON DELETE CASCADE,
    id_agente INT REFERENCES agente_patogeno(id_agente) ON DELETE CASCADE,
    PRIMARY KEY (id_medicamento, id_agente)
);

-- Tabla de presentaciones comerciales
CREATE TABLE IF NOT EXISTS presentacion (
    id_presentacion SERIAL PRIMARY KEY,
    id_medicamento INT REFERENCES medicamento(id_medicamento) ON DELETE CASCADE,
    volumen VARCHAR(50),  -- Ej.: '10 mL vial', '20 mL vial', '1 dosis, caja de 12 dosis'
    concentracion VARCHAR(50) -- Ej.: '10 mg/mL'
);

-- Tabla de dosis recomendadas
CREATE TABLE IF NOT EXISTS dosis_recomendada (
    id_dosis SERIAL PRIMARY KEY,
    id_medicamento INT REFERENCES medicamento(id_medicamento) ON DELETE CASCADE,
    edad_minima_semanas INT,
    intervalo_revacunacion INT,  -- Ej.: '14 a 21 días', 'Anual'
    detalle_dosis TEXT
);
--tabla de razas para mascotas
CREATE TABLE IF NOT EXISTS raza (
    id_raza SERIAL PRIMARY KEY,
    nombre_raza VARCHAR(100) NOT NULL,
    id_especie INT REFERENCES especie(id_especie) ON DELETE CASCADE,
    descripcion TEXT
);

-- Tabla de pacientes (mascotas)
CREATE TABLE IF NOT EXISTS mascota (
    id_mascota SERIAL PRIMARY KEY,
    nombre_mascota VARCHAR(100) NOT NULL,
    id_especie INT REFERENCES especie(id_especie),
    id_raza INT REFERENCES raza(id_raza), -- ← relación directa
    fecha_nacimiento DATE,
    rasgos_distintivos TEXT
);

-- Registro de aplicaciones de medicamentos
CREATE TABLE IF NOT EXISTS aplicacion_medicamento (
    id_aplicacion SERIAL PRIMARY KEY,
    id_mascota INT REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    id_medicamento INT REFERENCES medicamento(id_medicamento) ON DELETE CASCADE,
    fecha_aplicacion DATE NOT NULL,
    dosis VARCHAR(50),
    observaciones TEXT
);

-- Fotos de medicamentos
CREATE TABLE IF NOT EXISTS foto_medicamento (
    id_foto SERIAL PRIMARY KEY,
    id_medicamento INT REFERENCES medicamento(id_medicamento) ON DELETE CASCADE,
    imagen BYTEA NOT NULL,
    descripcion TEXT
);

-- Fotos de agentes
CREATE TABLE IF NOT EXISTS foto_agente (
    id_foto SERIAL PRIMARY KEY,
    id_agente INT REFERENCES agente_patogeno(id_agente) ON DELETE CASCADE,
    imagen BYTEA NOT NULL,
    descripcion TEXT
);

-- Fotos de mascotas
CREATE TABLE IF NOT EXISTS foto_mascota (
    id_foto SERIAL PRIMARY KEY,
    id_mascota INT REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    imagen BYTEA NOT NULL,
    descripcion TEXT,
    fecha_foto DATE NOT NULL DEFAULT CURRENT_DATE
);
-- Usuario
CREATE TABLE Usuarios (
    curp VARCHAR(18) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    apellido_paterno VARCHAR(100) NOT NULL,
    apellido_materno VARCHAR(100),
    fecha_nacimiento DATE,
    contrasena TEXT NOT NULL,
    foto BYTEA,
    id_ubicacion INT REFERENCES ubicacion(id_ubicacion) ON DELETE SET NULL
);

CREATE TABLE Telefonos (
    id SERIAL PRIMARY KEY,
    curp CHAR(18) REFERENCES Usuarios(curp) ON DELETE CASCADE,
    telefono VARCHAR(15) NOT NULL
);

CREATE TABLE CorreosElectronicos (
    id SERIAL PRIMARY KEY,
    curp CHAR(18) REFERENCES Usuarios(curp) ON DELETE CASCADE,
    correo_electronico VARCHAR(150) NOT NULL UNIQUE
);
-- Adopciones de mascotas
CREATE TABLE Adopciones (
    id SERIAL PRIMARY KEY,
    id_mascota INT REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    curp CHAR(18) REFERENCES Usuarios(curp) ON DELETE CASCADE,
    fecha_adopcion DATE NOT NULL,
    observaciones TEXT
);

CREATE TABLE IF NOT EXISTS mascota_adopcion (
    id SERIAL PRIMARY KEY,
    id_mascota INT UNIQUE REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    curp_publicador CHAR(18) REFERENCES Usuarios(curp) ON DELETE SET NULL,
    fecha_publicacion DATE NOT NULL DEFAULT CURRENT_DATE,
    id_ubicacion INT REFERENCES ubicacion(id_ubicacion) ON DELETE SET NULL,
    descripcion TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'Disponible'
);
-- Tabla de albergues (ya la tienes si no tienes conflicto)
CREATE TABLE IF NOT EXISTS albergue (
    id_albergue SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    id_ubicacion INT REFERENCES ubicacion(id_ubicacion) ON DELETE SET NULL,
    telefono VARCHAR(15),
    correo VARCHAR(150)
);

CREATE TABLE IF NOT EXISTS solicitud_adopcion (
    id SERIAL PRIMARY KEY,
    id_mascota INT REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    curp_solicitante CHAR(18) REFERENCES Usuarios(curp) ON DELETE CASCADE,
    fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE,
    mensaje TEXT,
    estado_solicitud VARCHAR(20) DEFAULT 'Pendiente' -- Pendiente, Aprobada, Rechazada
);

CREATE TABLE IF NOT EXISTS estado_mascota (
    id_mascota INT PRIMARY KEY REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('Disponible', 'Adoptada', 'Perdida', 'Encontrada', 'Cancelada')),
    fecha_actualizacion DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS reporte_mascota_perdida (
    id SERIAL PRIMARY KEY,
    id_mascota INT UNIQUE REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    curp_reportante CHAR(18) REFERENCES Usuarios(curp) ON DELETE SET NULL,
    fecha_reporte DATE NOT NULL DEFAULT CURRENT_DATE,
    id_ubicacion INT REFERENCES ubicacion(id_ubicacion) ON DELETE SET NULL,
    descripcion TEXT,
    recompensa NUMERIC(10, 2) CHECK (recompensa >= 0)
);


CREATE TABLE IF NOT EXISTS reporte_mascota_encontrada (
    id SERIAL PRIMARY KEY,
    id_mascota INT UNIQUE REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    curp_reportante CHAR(18) REFERENCES Usuarios(curp) ON DELETE SET NULL,
    fecha_reporte DATE NOT NULL DEFAULT CURRENT_DATE,
    lugar_encontrada TEXT NOT NULL,
    id_albergue INT REFERENCES albergue(id_albergue) ON DELETE SET NULL,
    descripcion TEXT
);

CREATE TABLE IF NOT EXISTS solicitud_ayuda_perdida (
    id SERIAL PRIMARY KEY,
    id_mascota INT REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    curp_solicitante CHAR(18) REFERENCES Usuarios(curp) ON DELETE CASCADE,
    mensaje TEXT,
    fecha_solicitud DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS propietario_mascota (
    id SERIAL PRIMARY KEY,
    id_mascota INT REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    curp CHAR(18) REFERENCES Usuarios(curp) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    fecha_fin DATE,  -- NULL si aún es el propietario
    tipo_relacion VARCHAR(50) DEFAULT 'Dueño'  -- Ej.: Dueño, Cuidador, Temporal
);

-- Tabla de veterinarias
CREATE TABLE IF NOT EXISTS veterinaria (
    id_veterinaria SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    id_ubicacion INT REFERENCES ubicacion(id_ubicacion) ON DELETE SET NULL,
    telefono VARCHAR(15),
    correo VARCHAR(150)
);
-- Fotos de la veterinaria
CREATE TABLE IF NOT EXISTS foto_veterinaria (
    id_foto SERIAL PRIMARY KEY,
    id_veterinaria INT REFERENCES veterinaria(id_veterinaria) ON DELETE CASCADE,
    imagen BYTEA NOT NULL,
    descripcion TEXT,
    fecha_foto DATE NOT NULL DEFAULT CURRENT_DATE
);
-- Fotos de albergue
CREATE TABLE IF NOT EXISTS foto_albergue (
    id_foto SERIAL PRIMARY KEY,
    id_albergue INT REFERENCES albergue(id_albergue) ON DELETE CASCADE,
    imagen BYTEA NOT NULL,
    descripcion TEXT,
    fecha_foto DATE NOT NULL DEFAULT CURRENT_DATE
);

-- Qué medicamentos tiene una veterinaria
CREATE TABLE IF NOT EXISTS medicamento_veterinaria (
    id_veterinaria INT REFERENCES veterinaria(id_veterinaria) ON DELETE CASCADE,
    id_medicamento INT REFERENCES medicamento(id_medicamento) ON DELETE CASCADE,
    cantidad_disponible INT DEFAULT 0,
    fecha_actualizacion DATE DEFAULT CURRENT_DATE,
    PRIMARY KEY (id_veterinaria, id_medicamento)
);

-- Servicios posibles por especie (baño, corte, vacunas especiales, etc.)
CREATE TABLE IF NOT EXISTS servicio (
    id_servicio SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    id_especie INT REFERENCES especie(id_especie) ON DELETE CASCADE
);

-- Servicios ofrecidos por una veterinaria
CREATE TABLE IF NOT EXISTS servicio_veterinaria (
    id_veterinaria INT REFERENCES veterinaria(id_veterinaria) ON DELETE CASCADE,
    id_servicio INT REFERENCES servicio(id_servicio) ON DELETE CASCADE,
    precio NUMERIC(8,2),
    duracion_aproximada INTERVAL, -- Ejemplo: '00:30:00' para 30 minutos
    PRIMARY KEY (id_veterinaria, id_servicio)
);

-- Servicios realizados a una mascota (historial)
CREATE TABLE IF NOT EXISTS servicio_mascota (
    id SERIAL PRIMARY KEY,
    id_mascota INT REFERENCES mascota(id_mascota) ON DELETE CASCADE,
    id_servicio INT REFERENCES servicio(id_servicio) ON DELETE SET NULL,
    id_veterinaria INT REFERENCES veterinaria(id_veterinaria) ON DELETE SET NULL,
    fecha_servicio DATE NOT NULL DEFAULT CURRENT_DATE,
    observaciones TEXT,
    costo NUMERIC CHECK (costo > 0),
    estrellas INT CHECK (estrellas >= 1 AND estrellas <= 5) DEFAULT NULL -- Calificación del servicio (opcional, si se quiere calificar el servicio recibido
);
