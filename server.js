require('dotenv').config();
const express = require('express');
const { Client } = require('pg');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'mi_secreto_super_seguro';

// Middleware Global
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Base de Datos
const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});
client.connect()
    .then(() => console.log('Conectado a la Base de Datos'))
    .catch(err => console.error('Error de conexión DB', err));

// --- MIDDLEWARE DE SEGURIDAD ---
const verificarToken = (req, res, next) => {
    const token = req.headers['authorization'];
    if (!token) return res.status(403).json({ error: 'Acceso denegado: Se requiere Token' });

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// --- RUTAS DE AUTENTICACIÓN ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await client.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(400).json({ error: 'Usuario no encontrado' });
        
        const user = result.rows[0];
        const valida = await bcrypt.compare(password, user.password);
        if (!valida) return res.status(400).json({ error: 'Contraseña incorrecta' });

        const token = jwt.sign({ id: user.id, username: user.username, rol: user.rol }, SECRET_KEY, { expiresIn: '8h' });
        res.json({ token, username: user.username, rol: user.rol });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GESTIÓN DE USUARIOS ---
app.get('/api/usuarios', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    try {
        const result = await client.query('SELECT id, username, rol FROM usuarios ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/usuarios', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { username, password, rol } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query('INSERT INTO usuarios (username, password, rol) VALUES ($1, $2, $3)', [username, hashedPassword, rol]);
        res.json({ message: 'Usuario creado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/usuarios/:id', verificarToken, async (req, res) => {
    if (req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    const { id } = req.params; const { password } = req.body;
    if (!password || password.length < 4) return res.status(400).json({ error: 'Mínimo 4 caracteres' });
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await client.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hashedPassword, id]);
        res.json({ message: 'Contraseña actualizada' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/usuarios/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Acceso denegado' });
    try {
        await client.query('DELETE FROM usuarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GESTIÓN DE ACTIVIDADES ---
app.get('/api/actividades', verificarToken, async (req, res) => {
    try { const result = await client.query('SELECT * FROM actividades ORDER BY fecha ASC'); res.json(result.rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/actividades', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { fecha, actividad, detalles } = req.body;
    try { const result = await client.query('INSERT INTO actividades (fecha, actividad, detalles) VALUES ($1, $2, $3) RETURNING *', [fecha, actividad, detalles]); res.json(result.rows[0]); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/actividades/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { completado } = req.body;
    try { await client.query('UPDATE actividades SET completado = $1 WHERE id = $2', [completado, req.params.id]); res.json({ message: 'Estado actualizado' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/actividades/editar/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { fecha, actividad, detalles } = req.body;
    try { await client.query('UPDATE actividades SET fecha = $1, actividad = $2, detalles = $3 WHERE id = $4', [fecha, actividad, detalles, req.params.id]); res.json({ message: 'Editado' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/actividades/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try { await client.query('DELETE FROM actividades WHERE id = $1', [req.params.id]); res.json({ message: 'Eliminado' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GESTIÓN DE MIEMBROS ---
app.get('/api/miembros', verificarToken, async (req, res) => {
    try { const result = await client.query('SELECT * FROM miembros ORDER BY nombre ASC'); res.json(result.rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.post('/api/miembros', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { nombre, fecha_nacimiento, congregacion, bautizado, confirmado } = req.body;
    try { await client.query('INSERT INTO miembros (nombre, fecha_nacimiento, congregacion, bautizado, confirmado) VALUES ($1, $2, $3, $4, $5)', [nombre, fecha_nacimiento, congregacion, bautizado, confirmado]); res.json({ message: 'Agregado' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/miembros/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { nombre, fecha_nacimiento, congregacion, bautizado, confirmado } = req.body;
    try { await client.query('UPDATE miembros SET nombre = $1, fecha_nacimiento = $2, congregacion = $3, bautizado = $4, confirmado = $5 WHERE id = $6', [nombre, fecha_nacimiento, congregacion, bautizado, confirmado, req.params.id]); res.json({ message: 'Actualizado' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.delete('/api/miembros/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try { await client.query('DELETE FROM miembros WHERE id = $1', [req.params.id]); res.json({ message: 'Eliminado' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GESTIÓN DE EQUIPO PASTORAL ---
app.get('/api/equipo', async (req, res) => {
    try { const result = await client.query('SELECT * FROM equipo_pastoral ORDER BY nivel ASC, id ASC'); res.json(result.rows); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});
app.put('/api/equipo/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { nombre } = req.body;
    try { await client.query('UPDATE equipo_pastoral SET nombre = $1 WHERE id = $2', [nombre, req.params.id]); res.json({ message: 'Actualizado' }); } 
    catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GESTIÓN DE FINANZAS (NUEVO MÓDULO) ---

// 1. Obtener Datos del Dashboard
app.get('/api/finanzas/datos', verificarToken, async (req, res) => {
    try {
        // Ejecutamos las 3 consultas en paralelo
        const transacciones = await client.query('SELECT * FROM finanzas_transacciones ORDER BY fecha DESC, id DESC');
        const talonarios = await client.query('SELECT * FROM finanzas_talonarios ORDER BY id ASC');
        const categorias = await client.query('SELECT * FROM finanzas_categorias ORDER BY nombre ASC');

        res.json({
            transacciones: transacciones.rows,
            talonarios: talonarios.rows,
            categorias: categorias.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error cargando datos financieros' });
    }
});

// 2. Guardar Transacción
app.post('/api/finanzas/transacciones', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { fecha, tipo, categoria, descripcion, monto, recibo_no } = req.body;
    try {
        const result = await client.query(
            'INSERT INTO finanzas_transacciones (fecha, tipo, categoria, descripcion, monto, recibo_no) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [fecha, tipo, categoria, descripcion, monto, recibo_no]
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 3. Gestión de Talonarios (ACTUALIZADO)
app.post('/api/finanzas/talonarios', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    // AHORA RECIBIMOS "tipo"
    const { nombre, inicio, fin, actual, tipo } = req.body; 
    try {
        const result = await client.query(
            'INSERT INTO finanzas_talonarios (nombre, rango_inicio, rango_fin, actual, activo, tipo) VALUES ($1, $2, $3, $4, true, $5) RETURNING *',
            [nombre, inicio, fin, actual, tipo || 'ingreso']
        );
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/finanzas/talonarios/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { id } = req.params;
    // Agregamos 'inicio' a los campos recibidos
    const { nombre, inicio, fin, actual, activo, tipo } = req.body; 
    try {
        if (activo && tipo) {
            await client.query('UPDATE finanzas_talonarios SET activo = false WHERE tipo = $1', [tipo]);
        }

        let query = 'UPDATE finanzas_talonarios SET ';
        const values = [];
        let index = 1;

        if (nombre !== undefined) { query += `nombre = $${index++}, `; values.push(nombre); }
        if (inicio !== undefined) { query += `rango_inicio = $${index++}, `; values.push(inicio); } // <--- NUEVO
        if (fin !== undefined) { query += `rango_fin = $${index++}, `; values.push(fin); }
        if (actual !== undefined) { query += `actual = $${index++}, `; values.push(actual); }
        if (activo !== undefined) { query += `activo = $${index++}, `; values.push(activo); }

        query = query.slice(0, -2);
        query += ` WHERE id = $${index} RETURNING *`;
        values.push(id);

        const result = await client.query(query, values);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/finanzas/talonarios/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    const { id } = req.params;
    const { nombre, fin, actual, activo } = req.body;
    try {
        if (activo) {
            // Si activamos uno, desactivamos los demás
            await client.query('UPDATE finanzas_talonarios SET activo = false');
        }

        // Construcción dinámica del UPDATE
        let query = 'UPDATE finanzas_talonarios SET ';
        const values = [];
        let index = 1;

        if (nombre !== undefined) { query += `nombre = $${index++}, `; values.push(nombre); }
        if (fin !== undefined) { query += `rango_fin = $${index++}, `; values.push(fin); }
        if (actual !== undefined) { query += `actual = $${index++}, `; values.push(actual); }
        if (activo !== undefined) { query += `activo = $${index++}, `; values.push(activo); }

        query = query.slice(0, -2); // Quitar última coma
        query += ` WHERE id = $${index} RETURNING *`;
        values.push(id);

        const result = await client.query(query, values);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/finanzas/talonarios/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try {
        await client.query('DELETE FROM finanzas_talonarios WHERE id = $1', [req.params.id]);
        res.json({ message: 'Eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Gestión de Categorías
app.post('/api/finanzas/categorias', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try {
        const result = await client.query('INSERT INTO finanzas_categorias (nombre) VALUES ($1) RETURNING *', [req.body.nombre]);
        res.json(result.rows[0]);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/finanzas/categorias/:id', verificarToken, async (req, res) => {
    if(req.user.rol !== 'admin') return res.status(403).json({ error: 'Denegado' });
    try {
        await client.query('DELETE FROM finanzas_categorias WHERE id = $1', [req.params.id]);
        res.json({ message: 'Eliminado' });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- RUTA COMODÍN (AL FINAL SIEMPRE) ---
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(port, () => { console.log(`Servidor en puerto ${port}`); });