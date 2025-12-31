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
// --- GESTIÓN DE USUARIOS ---

// 1. OBTENER TODOS (Esta es la que te falta)
app.get('/api/usuarios', verificarToken, async (req, res) => {
    // Seguridad extra: Solo admin puede ver la lista
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });

    try {
        const result = await client.query('SELECT id, username, rol FROM usuarios ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. CREAR USUARIO
app.post('/api/usuarios', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    
    const { username, password, rol } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query('INSERT INTO usuarios (username, password, rol) VALUES ($1, $2, $3)', [username, hashedPassword, rol]);
        res.json({ message: 'Usuario creado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. CAMBIAR CONTRASEÑA (La nueva que hicimos)
app.put('/api/usuarios/:id', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });

    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) return res.status(400).json({ error: 'Mínimo 4 caracteres' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedPassword, id]);
        res.json({ message: 'Contraseña actualizada' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. ELIMINAR USUARIO
app.delete('/api/usuarios/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    
    try {
        await client.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado' });
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

/// --- GESTIÓN DE MIEMBROS (ACTUALIZADO) ---

// 1. Obtener miembros
app.get('/api/miembros', verificarToken, async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM miembros ORDER BY nombre ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Agregar miembro (AHORA CON FECHA DE NACIMIENTO)
app.post('/api/miembros', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admins pueden agregar' });

    // Nota: Ya no pedimos 'edad', la calcularemos en el frontend
    const { nombre, fecha_nacimiento, congregacion, bautizado, confirmado } = req.body;
    
    try {
        await client.query(
            'INSERT INTO miembros (nombre, fecha_nacimiento, congregacion, bautizado, confirmado) VALUES ($1, $2, $3, $4, $5)', 
            [nombre, fecha_nacimiento, congregacion, bautizado, confirmado]
        );
        res.json({ message: 'Miembro agregado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. EDITAR MIEMBRO (NUEVA RUTA)
app.put('/api/miembros/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admins pueden editar' });

    const { id } = req.params;
    const { nombre, fecha_nacimiento, congregacion, bautizado, confirmado } = req.body;

    try {
        await client.query(
            'UPDATE miembros SET nombre = $1, fecha_nacimiento = $2, congregacion = $3, bautizado = $4, confirmado = $5 WHERE id = $6',
            [nombre, fecha_nacimiento, congregacion, bautizado, confirmado, id]
        );
        res.json({ message: 'Miembro actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. Eliminar miembro
app.delete('/api/miembros/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admins pueden eliminar' });

    const { id } = req.params;
    try {
        await client.query('DELETE FROM miembros WHERE id = $1', [id]);
        res.json({ message: 'Miembro eliminado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// --- RUTA PARA RESETEAR CONTRASEÑA (SOLO ADMIN) ---
app.put('/api/usuarios/:id', verificarToken, async (req, res) => {
    // 1. Solo el admin puede hacer esto
    if (req.user.rol !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { password } = req.body;

    if (!password || password.length < 4) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
    }

    try {
        // 2. Encriptamos la nueva contraseña antes de guardarla
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Actualizamos en la base de datos
        await client.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedPassword, id]);
        
        res.json({ message: 'Contraseña actualizada correctamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error interno del servidor' });
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
// --- GESTIÓN DE EQUIPO PASTORAL (TE FALTABA ESTO) ---

// 1. Obtener equipo
app.get('/api/equipo', async (req, res) => {
    try {
        // Ordenamos por nivel (jerarquía) y luego por ID
        const result = await client.query('SELECT * FROM equipo_pastoral ORDER BY nivel ASC, id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Asignar nombre (Solo Admin)
app.put('/api/equipo/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admins pueden editar' });

    const { id } = req.params;
    const { nombre } = req.body;

    try {
        await client.query('UPDATE equipo_pastoral SET nombre = $1 WHERE id = $2', [nombre, id]);
        res.json({ message: 'Cargo actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
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
app.get(/.*/, (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// --- GESTIÓN DE EQUIPO PASTORAL ---

// 1. Obtener equipo (Ordenado por jerarquía)
app.get('/api/equipo', async (req, res) => {
    try {
        const result = await client.query('SELECT * FROM equipo_pastoral ORDER BY nivel ASC, id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Asignar nombre al cargo (Solo Admin)
app.put('/api/equipo/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Solo admins pueden editar' });

    const { id } = req.params;
    const { nombre } = req.body; // Solo cambiamos el nombre, el cargo es fijo

    try {
        await client.query('UPDATE equipo_pastoral SET nombre = $1 WHERE id = $2', [nombre, id]);
        res.json({ message: 'Cargo actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(port, () => {
    console.log(`Servidor seguro corriendo en el puerto ${port}`);
});