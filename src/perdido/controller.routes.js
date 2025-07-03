const express = require('express');
const router = express.Router();
const pool = require('../db');

// Mostrar formulario para reportar mascota perdida
router.get('/alta', async (req, res) => {
  try {
    // Solo mostrar mascotas que pertenezcan al usuario actual y no estén marcadas como 'Perdida'
    const result = await pool.query(`
      SELECT m.id_mascota, m.nombre_mascota
      FROM mascota m
      JOIN propietario_mascota p ON m.id_mascota = p.id_mascota
      WHERE p.curp = $1 AND (p.fecha_fin IS NULL OR p.fecha_fin > CURRENT_DATE)
        AND NOT EXISTS (
          SELECT 1 FROM estado_mascota e
          WHERE e.id_mascota = m.id_mascota AND e.estado = 'Perdida'
        )
      ORDER BY m.nombre_mascota
    `, [req.session.usuario?.curp]);

    res.render('perdido/alta_perdido', { mascotas: result.rows });
  } catch (err) {
    console.error('Error al mostrar formulario de pérdida:', err);
    res.status(500).send('Error al cargar formulario');
  }
});

// Guardar reporte de pérdida
router.post('/alta', async (req, res) => {
  const {
    id_mascota, descripcion, recompensa,
    latitud, longitud, calle, numero, colonia,
    alcaldia, estado, codigo_postal
  } = req.body;

  const curp_reportante = req.session.usuario?.curp;
  const cliente = await pool.connect();

  try {
    await cliente.query('BEGIN');

    // Insertar ubicación
    const resultUbicacion = await cliente.query(`
      INSERT INTO ubicacion (latitud, longitud, calle, numero, colonia, alcaldia, estado, codigo_postal)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id_ubicacion
    `, [latitud, longitud, calle, numero, colonia, alcaldia, estado, codigo_postal]);

    const id_ubicacion = resultUbicacion.rows[0].id_ubicacion;

    // Insertar reporte de pérdida
    await cliente.query(`
      INSERT INTO reporte_mascota_perdida (id_mascota, curp_reportante, id_ubicacion, descripcion, recompensa)
      VALUES ($1, $2, $3, $4, $5)
    `, [id_mascota, curp_reportante, id_ubicacion, descripcion, recompensa || null]);

    // Actualizar estado de la mascota
    await cliente.query(`
      INSERT INTO estado_mascota (id_mascota, estado)
      VALUES ($1, 'Perdida')
      ON CONFLICT (id_mascota)
      DO UPDATE SET estado = 'Perdida', fecha_actualizacion = CURRENT_DATE
    `, [id_mascota]);

    await cliente.query('COMMIT');
    res.redirect('/perdido/alta');
  } catch (err) {
    await cliente.query('ROLLBACK');
    console.error('Error al guardar reporte de pérdida:', err);
    res.status(500).send('Error al reportar mascota como perdida');
  } finally {
    cliente.release();
  }
});

module.exports = router;
