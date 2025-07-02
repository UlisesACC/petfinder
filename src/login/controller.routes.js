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

// Editar usuario
router.get('/editar', async (req, res) => {
    if (!req.session.usuario) {
        return res.redirect('/');
    }

    try {
        const cliente = await pool.connect();
        const { curp } = req.session.usuario;

        const result = await cliente.query(`
            SELECT u.*, 
                   COALESCE(json_agg(DISTINCT ce.correo_electronico) FILTER (WHERE ce.correo_electronico IS NOT NULL), '[]') AS correos,
                   COALESCE(json_agg(DISTINCT t.telefono) FILTER (WHERE t.telefono IS NOT NULL), '[]') AS telefonos,
                   ub.*
            FROM Usuarios u
            LEFT JOIN CorreosElectronicos ce ON ce.curp = u.curp
            LEFT JOIN Telefonos t ON t.curp = u.curp
            LEFT JOIN ubicacion ub ON ub.id_ubicacion = u.id_ubicacion
            WHERE u.curp = $1
            GROUP BY u.curp, ub.id_ubicacion
        `, [curp]);

        cliente.release();
        if (result.rows.length === 0) return res.status(404).send('Usuario no encontrado');

        const usuario = result.rows[0];
        res.render('login/editar', { usuario });

    } catch (err) {
        console.error('Error al obtener usuario para edición:', err);
        res.status(500).send('Error interno del servidor');
    }
});

router.post('/editar', upload.single('foto'), async (req, res) => {
    if (!req.session.usuario) return res.redirect('/');

    const { curp } = req.session.usuario;
    const {
        nombre,
        apellido_paterno,
        apellido_materno,
        fecha_nacimiento,
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

    try {
        const cliente = await pool.connect();

        // Actualizar ubicación (asumiendo que solo hay una por usuario)
        const resultUbicacion = await cliente.query(`
            UPDATE ubicacion SET
                calle=$1, numero=$2, colonia=$3, alcaldia=$4,
                estado=$5, codigo_postal=$6, latitud=$7, longitud=$8
            WHERE id_ubicacion = (SELECT id_ubicacion FROM usuarios WHERE curp = $9)
        `, [calle, numero, colonia, alcaldia, estado, codigo_postal, latitud, longitud, curp]);

        // Actualizar usuario
        await cliente.query(`
            UPDATE usuarios SET
                nombre=$1, apellido_paterno=$2, apellido_materno=$3, fecha_nacimiento=$4,
                foto = COALESCE($5, foto)
            WHERE curp = $6
        `, [nombre, apellido_paterno, apellido_materno || null, fecha_nacimiento, req.file ? req.file.buffer : null, curp]);

        // Reemplazar correos y teléfonos
        await cliente.query(`DELETE FROM CorreosElectronicos WHERE curp = $1`, [curp]);
        await cliente.query(`DELETE FROM Telefonos WHERE curp = $1`, [curp]);

        for (const correo of Array.isArray(correos) ? correos : [correos]) {
            if (correo.trim()) {
                await cliente.query(`INSERT INTO CorreosElectronicos (curp, correo_electronico) VALUES ($1, $2)`, [curp, correo.trim()]);
            }
        }

        for (const tel of Array.isArray(telefonos) ? telefonos : [telefonos]) {
            if (tel.trim()) {
                await cliente.query(`INSERT INTO Telefonos (curp, telefono) VALUES ($1, $2)`, [curp, tel.trim()]);
            }
        }

        cliente.release();
        res.redirect('/');

    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).send('Error al actualizar datos');
    }
});

router.post('/eliminar-usuario', async (req, res) => {
    if (!req.session.usuario) return res.redirect('/');

    const { curp } = req.session.usuario;

    try {
        const cliente = await pool.connect();
        await cliente.query(`DELETE FROM Usuarios WHERE curp = $1`, [curp]);
        cliente.release();

        req.session.destroy(() => {
            res.redirect('/');
        });

    } catch (err) {
        console.error('Error al eliminar usuario:', err);
        res.status(500).send('Error al eliminar cuenta');
    }
});


module.exports = router;