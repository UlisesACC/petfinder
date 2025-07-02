require("dotenv").config();
const express = require("express");
const path = require("path");
const multer = require('multer');

const app = express();
const session = require('express-session');
const port = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage }); 

const methodOverride = require('method-override');
app.use(methodOverride('_method')); 
// Configuraciones de Express
app.use(session({
  secret: 'busca_huellitas_super_secreto', // usa una cadena más fuerte en producción
  resave: false,
  saveUninitialized: false
}));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src'));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Rutas (controllers)
app.use('/src', express.static(path.join(__dirname, 'src')));
app.use('/login', require('./src/login/controller.routes'));
app.use('/', require('./src/inicio/controller.routes'));

// Iniciar servidor
app.listen(port, () => {
  console.log(`Servidor corriendo en http://localhost:${port}`);
});
