const express = require('express');
const router = express.Router();
const pool = require('../db');

// Formulario
router.get('/alta', (req, res) => {
  res.render('albergue/alta');
});

// Guardar
router.post('/alta', async (req, res) => {
  const {
    nombre, descripcion, telefono, correo,
    latitud, longitud, calle, numero, colonia,
    alcaldia, estado, codigo_postal
  } = req.body;

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const resultUbicacion = await cliente.query(`
      INSERT INTO ubicacion (latitud, longitud, calle, numero, colonia, alcaldia, estado, codigo_postal)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING id_ubicacion
    `, [latitud, longitud, calle, numero, colonia, alcaldia, estado, codigo_postal]);

    const id_ubicacion = resultUbicacion.rows[0].id_ubicacion;

    await cliente.query(`
      INSERT INTO albergue (nombre, descripcion, telefono, correo, id_ubicacion)
      VALUES ($1,$2,$3,$4,$5)
    `, [nombre, descripcion || null, telefono || null, correo || null, id_ubicacion]);

    await cliente.query('COMMIT');
    res.redirect('/albergue/alta');
  } catch (err) {
    await cliente.query('ROLLBACK');
    console.error('Error al registrar albergue:', err);
    res.status(500).send('Error al registrar albergue');
  } finally {
    cliente.release();
  }
});
// ============= editar =============
router.get('/tabla', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM albergue ORDER BY nombre');
    res.render('albergue/tabla', { albergues: result.rows });
  } catch (error) {
    console.error('Error al obtener albergues:', error);
    res.status(500).send('Error al obtener albergues');
  }
});
// ============= eliminar =============
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    // Obtener id_ubicacion del albergue antes de borrarlo
    const result = await cliente.query('SELECT id_ubicacion FROM albergue WHERE id_albergue = $1', [id]);
    if (result.rows.length === 0) {
      await cliente.query('ROLLBACK');
      return res.status(404).send('Albergue no encontrado');
    }
    const id_ubicacion = result.rows[0].id_ubicacion;

    // Eliminar albergue
    await cliente.query('DELETE FROM albergue WHERE id_albergue = $1', [id]);

    // Eliminar ubicación asociada si no está en uso por otro albergue o entidad
    const ubicacionUsada = await cliente.query(
      'SELECT COUNT(*) FROM albergue WHERE id_ubicacion = $1',
      [id_ubicacion]
    );
    if (ubicacionUsada.rows[0].count === '0') {
      await cliente.query('DELETE FROM ubicacion WHERE id_ubicacion = $1', [id_ubicacion]);
    }

    await cliente.query('COMMIT');
    res.redirect('/albergue/tabla');
  } catch (error) {
    await cliente.query('ROLLBACK');
    console.error('Error al eliminar albergue:', error);
    res.status(500).send('Error al eliminar albergue');
  } finally {
    cliente.release();
  }
});

router.get('/editar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM albergue WHERE id_albergue = $1', [id]);
    if (result.rows.length === 0) return res.status(404).send('Albergue no encontrado');
    res.render('albergue/editar', { albergue: result.rows[0] });
  } catch (err) {
    console.error('Error al cargar albergue:', err);
    res.status(500).send('Error al cargar albergue');
  }
});

router.post('/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, telefono, correo } = req.body;
  try {
    await pool.query(`
      UPDATE albergue
      SET nombre = $1, descripcion = $2, telefono = $3, correo = $4
      WHERE id_albergue = $5
    `, [nombre, descripcion || null, telefono || null, correo || null, id]);
    res.redirect('/albergue/tabla');
  } catch (err) {
    console.error('Error al actualizar albergue:', err);
    res.status(500).send('Error al actualizar albergue');
  }
});

module.exports = router;
