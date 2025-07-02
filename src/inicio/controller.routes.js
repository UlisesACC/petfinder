const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const bcrypt = require('bcrypt');

// Página de inicio
router.get('/', (req, res) => {
  res.render('inicio/index', {
    usuario: req.session.usuario || null
  });
});

// Procesamiento del login
router.post('/', async (req, res) => {
  const { identificador, contrasena } = req.body;

  try {
    const cliente = await pool.connect();

    let usuario;

    // Buscar por CURP
    const curpResult = await cliente.query(`
      SELECT u.curp, u.contrasena, u.nombre, u.foto
      FROM usuarios u
      WHERE u.curp = $1
    `, [identificador]);

    if (curpResult.rows.length > 0) {
      usuario = curpResult.rows[0];
    } else {
      // Buscar por correo electrónico
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

    // Guardar sesión
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

// Cerrar sesión
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error('Error al cerrar sesión:', err);
    }
    res.redirect('/');
  });
});

module.exports = router;
