const express = require('express');
const router = express.Router();
const pool = require('../db'); 
const bcrypt = require('bcrypt');

// Página de inicio
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT m.id_mascota, m.nombre_mascota, f.imagen AS foto, r.descripcion
      FROM reporte_mascota_perdida r
      JOIN mascota m ON m.id_mascota = r.id_mascota
      LEFT JOIN foto_mascota f ON f.id_mascota = m.id_mascota
      JOIN estado_mascota e ON e.id_mascota = m.id_mascota AND e.estado = 'Perdida'
      GROUP BY m.id_mascota, f.imagen, r.descripcion
    `);
    res.render('inicio/index', {
      usuario: req.session.usuario,
      mascotas_perdidas: result.rows
    });
  } catch (err) {
    console.error('Error al cargar inicio:', err);
    res.status(500).send('Error al cargar página de inicio');
  }
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

// Mostrar tabla de mascotas perdidas
router.get('/tabla', async (req, res) => {
  try {
    const curp = req.session.usuario?.curp;
    const result = await pool.query(`
      SELECT r.id, m.nombre_mascota, r.descripcion, r.recompensa, r.fecha_reporte,
             f.imagen AS foto
      FROM reporte_mascota_perdida r
      JOIN mascota m ON m.id_mascota = r.id_mascota
      LEFT JOIN foto_mascota f ON f.id_mascota = m.id_mascota
      WHERE r.curp_reportante = $1
      GROUP BY r.id, m.nombre_mascota, r.descripcion, r.recompensa, r.fecha_reporte, f.imagen
      ORDER BY r.fecha_reporte DESC
    `, [curp]);

    res.render('perdido/tabla_perdido', { reportes: result.rows });
  } catch (err) {
    console.error('Error al mostrar tabla de perdidos:', err);
    res.status(500).send('Error al mostrar reportes');
  }
});

// Eliminar reporte de mascota perdida
router.delete('/eliminar/:id', async (req, res) => {
  const { id } = req.params;
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const reporte = await cliente.query('SELECT id_mascota, id_ubicacion FROM reporte_mascota_perdida WHERE id = $1', [id]);
    if (reporte.rowCount === 0) {
      await cliente.query('ROLLBACK');
      return res.status(404).send('Reporte no encontrado');
    }

    const { id_mascota, id_ubicacion } = reporte.rows[0];

    await cliente.query('DELETE FROM reporte_mascota_perdida WHERE id = $1', [id]);

    await cliente.query(`
      UPDATE estado_mascota
      SET estado = 'Disponible', fecha_actualizacion = CURRENT_DATE
      WHERE id_mascota = $1
    `, [id_mascota]);

    await cliente.query('DELETE FROM ubicacion WHERE id_ubicacion = $1', [id_ubicacion]);

    await cliente.query('COMMIT');
    res.redirect('/perdido/tabla');
  } catch (err) {
    await cliente.query('ROLLBACK');
    console.error('Error al eliminar reporte:', err);
    res.status(500).send('Error al eliminar');
  } finally {
    cliente.release();
  }
});

module.exports = router;
