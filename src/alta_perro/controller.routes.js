const express = require('express');
const router = express.Router();
const pool = require('../db');
const methodOverride = require('method-override');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(methodOverride('_method'));


// =================== ESPECIES ===================

// Agregar especie
router.post('/especies', async (req, res) => {
  const { nombre_especie } = req.body;
  await pool.query('INSERT INTO especie(nombre_especie) VALUES ($1)', [nombre_especie]);
  res.redirect('/alta_perro/especies');
});

// Editar especie
router.post('/especies/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_especie } = req.body;
  await pool.query('UPDATE especie SET nombre_especie = $1 WHERE id_especie = $2', [nombre_especie, id]);
  res.redirect('/alta_perro/especies');
});

// Eliminar especie
router.post('/especies/eliminar/:id', async (req, res) => {
  const { id } = req.params;
  await pool.query('DELETE FROM especie WHERE id_especie = $1', [id]);
  res.redirect('/alta_perro/especies');
});


// =================== RAZAS ===================

// Formulario y vista de razas
router.get('/raza', async (req, res) => {
  try {
    const especiesResult = await pool.query('SELECT * FROM especie ORDER BY nombre_especie');
    const razasResult = await pool.query('SELECT * FROM raza ORDER BY nombre_raza ASC');
    res.render('alta_perro/raza', {
      especies: especiesResult.rows,
      razas: razasResult.rows,
      usuario: req.session.usuario
    });
  } catch (error) {
    console.error('Error al obtener razas o especies:', error);
    res.status(500).send('Error del servidor');
  }
});

// Guardar nueva raza
router.post('/raza', async (req, res) => {
  const { nombre_raza, id_especie, descripcion } = req.body;
  try {
    await pool.query(
      `INSERT INTO raza (nombre_raza, id_especie, descripcion)
       VALUES ($1, $2, $3)`,
      [nombre_raza, id_especie, descripcion || null]
    );
    res.redirect('/alta_perro/raza');
  } catch (err) {
    console.error('Error al insertar raza:', err);
    res.status(500).send('Error al guardar la raza');
  }
});

// Eliminar raza
router.delete('/raza/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM raza WHERE id_raza = $1', [id]);
    res.redirect('/alta_perro/raza');
  } catch (error) {
    console.error('Error al eliminar raza:', error);
    res.status(500).send('Error al eliminar raza');
  }
});


// =================== MASCOTAS ===================

// Formulario para registrar mascota
router.get('/alta', async (req, res) => {
  try {
    const especies = await pool.query('SELECT * FROM especie ORDER BY nombre_especie');
    const razas = await pool.query('SELECT * FROM raza ORDER BY nombre_raza');
    res.render('alta_perro/alta', {
      especies: especies.rows,
      razas: razas.rows,
      usuario: req.session.usuario
    });
  } catch (err) {
    console.error('Error al mostrar formulario de alta:', err);
    res.status(500).send('Error al mostrar formulario');
  }
});

// Guardar mascota y fotos
router.post('/alta', upload.array('fotos'), async (req, res) => {
  const { nombre_mascota, fecha_nacimiento, id_especie, id_raza, rasgos_distintivos, descripcion_foto } = req.body;
  const fotos = req.files;

  const cliente = await pool.connect();
  try {
    await cliente.query('BEGIN');

    const resultMascota = await cliente.query(
      `INSERT INTO mascota (nombre_mascota, fecha_nacimiento, id_especie, id_raza, rasgos_distintivos)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id_mascota`,
      [nombre_mascota, fecha_nacimiento, id_especie, id_raza, rasgos_distintivos]
    );

    const id_mascota = resultMascota.rows[0].id_mascota;

    for (const foto of fotos) {
      await cliente.query(
        `INSERT INTO foto_mascota (id_mascota, imagen, descripcion)
         VALUES ($1, $2, $3)`,
        [id_mascota, foto.buffer, descripcion_foto || null]
      );
    }

    await cliente.query('COMMIT');
    res.redirect('/alta_perro/alta');
  } catch (err) {
    await cliente.query('ROLLBACK');
    console.error('Error al registrar mascota:', err);
    res.status(500).send('Error al registrar mascota');
  } finally {
    cliente.release();
  }
});

// API para cargar razas por especie
router.get('/api/razas/:id_especie', async (req, res) => {
  const { id_especie } = req.params;
  try {
    const result = await pool.query('SELECT * FROM raza WHERE id_especie = $1 ORDER BY nombre_raza', [id_especie]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error al obtener razas:', err);
    res.status(500).json([]);
  }
});


// Vista para mostrar especies (CRUD)
router.get('/especies', async (req, res) => {
  const result = await pool.query('SELECT * FROM especie ORDER BY id_especie');
  res.render('alta_perro/especies', {
    especies: result.rows,
    usuario: req.session.usuario
  });
});

// ===Tabla de Razas===
router.get('/tabla', async (req, res) => {
  try {
    const especies = await pool.query('SELECT * FROM especie ORDER BY id_especie');
    const razas = await pool.query(`
      SELECT r.*, e.nombre_especie
      FROM raza r
      JOIN especie e ON r.id_especie = e.id_especie
      ORDER BY r.nombre_raza
    `);
    const mascotas = await pool.query(`
      SELECT m.id_mascota, m.nombre_mascota, e.nombre_especie, r.nombre_raza
      FROM mascota m
      JOIN especie e ON m.id_especie = e.id_especie
      JOIN raza r ON m.id_raza = r.id_raza
      ORDER BY m.id_mascota
    `);

    res.render('alta_perro/tabla', {
      especies: especies.rows,
      razas: razas.rows,
      mascotas: mascotas.rows
    });
  } catch (err) {
    console.error('Error al cargar tabla:', err);
    res.status(500).send('Error interno del servidor');
  }
});
//=================== Editar Especies ===================
// Mostrar formulario de edición de especie
router.get('/especies/editar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query('SELECT * FROM especie WHERE id_especie = $1', [id]);

    if (result.rows.length === 0) {
      return res.status(404).send('Especie no encontrada');
    }

    res.render('alta_perro/editar_especie', {
      especie: result.rows[0]
    });
  } catch (err) {
    console.error('Error al cargar especie:', err);
    res.status(500).send('Error del servidor');
  }
});

// Guardar cambios de especie (ya lo tienes, pero asegúrate que esté así)
router.post('/especies/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_especie } = req.body;
  try {
    await pool.query(
      'UPDATE especie SET nombre_especie = $1 WHERE id_especie = $2',
      [nombre_especie, id]
    );
    res.redirect('/alta_perro/tabla');
  } catch (err) {
    console.error('Error al editar especie:', err);
    res.status(500).send('Error al editar especie');
  }
});
// =================== Editar Raza ===================

// Mostrar formulario de edición de raza
router.get('/raza/editar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const razaResult = await pool.query('SELECT * FROM raza WHERE id_raza = $1', [id]);
    const especiesResult = await pool.query('SELECT * FROM especie ORDER BY nombre_especie');

    if (razaResult.rows.length === 0) {
      return res.status(404).send('Raza no encontrada');
    }

    res.render('alta_perro/editar_raza', {
      raza: razaResult.rows[0],
      especies: especiesResult.rows
    });
  } catch (error) {
    console.error('Error al cargar raza:', error);
    res.status(500).send('Error del servidor');
  }
});

// Guardar cambios en la raza
router.post('/raza/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_raza, id_especie, descripcion } = req.body;

  try {
    await pool.query(
      `UPDATE raza SET nombre_raza = $1, id_especie = $2, descripcion = $3
       WHERE id_raza = $4`,
      [nombre_raza, id_especie, descripcion || null, id]
    );
    res.redirect('/alta_perro/tabla');
  } catch (error) {
    console.error('Error al actualizar la raza:', error);
    res.status(500).send('Error al actualizar la raza');
  }
});
// =================== Eliminar Mascota ===================
// Mostrar formulario de edición de mascota
router.get('/alta/editar/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const mascotaResult = await pool.query('SELECT * FROM mascota WHERE id_mascota = $1', [id]);
    const especiesResult = await pool.query('SELECT * FROM especie ORDER BY nombre_especie');

    if (mascotaResult.rows.length === 0) {
      return res.status(404).send('Mascota no encontrada');
    }

    res.render('alta_perro/editar_alta', {
      mascota: mascotaResult.rows[0],
      especies: especiesResult.rows
    });
  } catch (err) {
    console.error('Error al cargar mascota:', err);
    res.status(500).send('Error del servidor');
  }
});

// Guardar edición de mascota
router.post('/alta/editar/:id', async (req, res) => {
  const { id } = req.params;
  const { nombre_mascota, fecha_nacimiento, id_especie, id_raza, rasgos_distintivos } = req.body;
  try {
    await pool.query(
      `UPDATE mascota
       SET nombre_mascota = $1, fecha_nacimiento = $2, id_especie = $3, id_raza = $4, rasgos_distintivos = $5
       WHERE id_mascota = $6`,
      [nombre_mascota, fecha_nacimiento, id_especie, id_raza, rasgos_distintivos, id]
    );
    res.redirect('/alta_perro/tabla');
  } catch (err) {
    console.error('Error al actualizar mascota:', err);
    res.status(500).send('Error al actualizar mascota');
  }
});

module.exports = router;
