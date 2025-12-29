require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs'); // NUEVO: Para encriptar
const jwt = require('jsonwebtoken'); // NUEVO: Para crear tokens

const app = express();
const port = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'mi_secreto_super_seguro'; // En producción esto va en .env

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Conexión a Neon (Asegúrate que tu .env tenga la URL de planner_db)
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
client.connect();

// --- 1. RUTAS DE AUTENTICACIÓN (LOGIN Y REGISTRO) ---

// Registrar usuario (Úsalo para crear tu primer admin)
app.post('/api/registro', async (req, res) => {
    const { username, password, rol } = req.body;
    
    // Encriptamos la contraseña antes de guardarla
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt); 

    try {
        // Usamos la tabla 'usuarios' normal porque estamos en una BD nueva
        await client.query('INSERT INTO usuarios (username, password, rol) VALUES ($1, $2, $3)', 
        [username, hashPassword, rol || 'invitado']);
        res.json({ message: 'Usuario creado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: 'Error: El usuario ya existe o datos inválidos' });
    }
});

// Iniciar Sesión
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await client.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        
        if (result.rows.length === 0) return res.status(400).json({ error: 'Usuario no encontrado' });
        
        const user = result.rows[0];
        const valida = await bcrypt.compare(password, user.password); // Comparamos clave real con encriptada

        if (!valida) return res.status(400).json({ error: 'Contraseña incorrecta' });

        // Crear Token (El "carnet" digital)
        const token = jwt.sign({ id: user.id, username: user.username, rol: user.rol }, SECRET_KEY, { expiresIn: '8h' });
        
        res.json({ token, username: user.username, rol: user.rol });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 2. MIDDLEWARE DE SEGURIDAD (EL PORTERO) ---
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Acceso denegado: Se requiere Token' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Guardamos los datos del usuario en la petición
        next(); // Dejamos pasar
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// --- 3. RUTAS PROTEGIDAS (ACTIVIDADES) ---

// Obtener todas (Requiere estar logueado, cualquier rol)
app.get('/api/actividades', verificarToken, async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM actividades ORDER BY fecha ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Crear una nueva (SOLO ADMIN)
app.post('/api/actividades', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden crear' });

    const { fecha, actividad, detalles } = req.body;
    try {
        const query = 'INSERT INTO actividades (fecha, actividad, detalles) VALUES ($1, $2, $3) RETURNING *';
        const result = await client.query(query, [fecha, actividad, detalles]);
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar estado (SOLO ADMIN)
app.put('/api/actividades/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden editar' });

    const { id } = req.params;
    const { completado } = req.body;
    try {
        const result = await client.query(
            'UPDATE actividades SET completado = $1 WHERE id = $2 RETURNING *',
            [completado, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// 5. Editar contenido de la actividad (SOLO ADMIN)
app.put('/api/actividades/editar/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden editar' });

    const { id } = req.params;
    const { fecha, actividad, detalles } = req.body;

    try {
        const result = await client.query(
            'UPDATE actividades SET fecha = $1, actividad = $2, detalles = $3 WHERE id = $4 RETURNING *',
            [fecha, actividad, detalles, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Eliminar actividad (SOLO ADMIN)
app.delete('/api/actividades/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo administradores pueden eliminar' });

    const { id } = req.params;
    try {
        await client.query('DELETE FROM actividades WHERE id = $1', [id]);
        res.json({ message: 'Actividad eliminada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- GESTIÓN DE USUARIOS (SOLO ADMIN) ---

// 1. Obtener lista de usuarios (Sin contraseña)
app.get('/api/usuarios', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });

    try {
        const result = await client.query('SELECT id, username, rol FROM usuarios ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Crear nuevo usuario (Reemplaza al registro público anterior)
app.post('/api/usuarios', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admins pueden crear usuarios' });

    const { username, password, rol } = req.body;
    
    // Validar que el rol sea correcto
    if (!['admin', 'invitado'].includes(rol)) {
        return res.status(400).json({ error: 'Rol inválido' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);

    try {
        await client.query('INSERT INTO usuarios (username, password, rol) VALUES ($1, $2, $3)', 
        [username, hashPassword, rol]);
        res.json({ message: 'Usuario creado exitosamente' });
    } catch (err) {
        res.status(500).json({ error: 'El usuario ya existe' });
    }
});

// 3. Eliminar usuario
app.delete('/api/usuarios/:id', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });

    const { id } = req.params;
    
    // Evitar que el admin se borre a sí mismo
    if (parseInt(id) === req.user.id) {
        return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta' });
    }

    try {
        await client.query('DELETE FROM usuarios WHERE id = $1', [id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- RUTA COMODÍN PARA ARREGLAR EL "NOT FOUND" ---
// Si entran a la raíz y falla lo automático, forzamos la entrada al login
app.get(/(.*)/, (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// Para cualquier otra ruta desconocida, redirigir al login
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});
app.listen(port, () => {
    console.log(`Servidor seguro corriendo en http://localhost:${port}`);
});