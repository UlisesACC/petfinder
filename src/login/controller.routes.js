const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const bcrypt = require('bcrypt');
// Almacenamiento en memoria (para guardar en la base de datos como BYTEA)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Vista del formulario de registro
router.get('/registro', (req, res) => {
    res.render('login/registro');
});

// Manejo del envío del formulario
router.post('/registro', upload.single('foto'), async (req, res) => {
    try {
        const {
            curp,
            nombre,
            apellido_paterno,
            apellido_materno,
            fecha_nacimiento,
            contrasena,
            calle,
            numero,
            colonia,
            alcaldia,
            estado,
            codigo_postal,
            latitud,
            longitud,
            correos = [],
            telefonos = []
        } = req.body;

        const cliente = await pool.connect();

        // Insertar ubicación y obtener id
        const resultUbicacion = await cliente.query(
            `INSERT INTO ubicacion (calle, numero, colonia, alcaldia, estado, codigo_postal, latitud, longitud)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id_ubicacion`,
            [calle, numero, colonia, alcaldia, estado, codigo_postal, latitud, longitud]
        );
        const id_ubicacion = resultUbicacion.rows[0].id_ubicacion;

        // Insertar usuario principal
        // Hashear la contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(contrasena, 10);

        // Insertar usuario principal con contraseña cifrada
        const resultUsuario = await cliente.query(
            `INSERT INTO Usuarios (curp, nombre, apellido_paterno, apellido_materno, fecha_nacimiento, contrasena, foto, id_ubicacion)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [
                curp,
                nombre,
                apellido_paterno,
                apellido_materno || null,
                fecha_nacimiento,
                hashedPassword, // ← Ahora está cifrada
                req.file ? req.file.buffer : null,
                id_ubicacion
            ]
        );


        // Insertar correos
        for (const correo of Array.isArray(correos) ? correos : [correos]) {
            if (correo.trim() !== '') {
                await cliente.query(
                    `INSERT INTO CorreosElectronicos (curp, correo_electronico) VALUES ($1, $2)`,
                    [curp, correo.trim()]
                );
            }
        }

        // Insertar teléfonos
        for (const telefono of Array.isArray(telefonos) ? telefonos : [telefonos]) {
            if (telefono.trim() !== '') {
                await cliente.query(
                    `INSERT INTO Telefonos (curp, telefono) VALUES ($1, $2)`,
                    [curp, telefono.trim()]
                );
            }
        }

        cliente.release();
        res.redirect('/');

    } catch (error) {
        console.error('Error al registrar usuario:', error);
        res.status(500).send('Error interno del servidor');
    }
});
// Render para el login
// Vista del formulario de login
router.get('/', (req, res) => {
    res.render('login/login');
});

// Procesamiento del login
router.post('/', async (req, res) => {
  const { identificador, contrasena } = req.body;

  try {
    const cliente = await pool.connect();

    let usuario;

    const curpResult = await cliente.query(`
      SELECT u.curp, u.contrasena, u.nombre, u.foto
      FROM usuarios u
      WHERE u.curp = $1
    `, [identificador]);

    if (curpResult.rows.length > 0) {
      usuario = curpResult.rows[0];
    } else {
      const correoResult = await cliente.query(`
        SELECT u.curp, u.contrasena, u.nombre, u.foto
        FROM usuarios u
        JOIN CorreosElectronicos c ON c.curp = u.curp
        WHERE c.correo_electronico = $1
      `, [identificador]);

      if (correoResult.rows.length > 0) {
        usuario = correoResult.rows[0];
      }
    }

    cliente.release();

    if (!usuario) {
      return res.status(401).send('Usuario no encontrado');
    }

    const passwordMatch = await bcrypt.compare(contrasena, usuario.contrasena);
    if (!passwordMatch) {
      return res.status(401).send('Contraseña incorrecta');
    }

    req.session.usuario = {
      curp: usuario.curp,
      nombre: usuario.nombre,
      foto: usuario.foto ? Buffer.from(usuario.foto).toString('base64') : null
    };

    res.redirect('/');
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    res.status(500).send('Error interno del servidor');
  }
});


module.exports = router;