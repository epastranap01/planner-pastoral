// --- 1. INICIO Y SEGURIDAD ---
console.log("Cargando sistema v9 (Usuarios corregido)..."); 

const token = localStorage.getItem('token');
const userRol = localStorage.getItem('rol');
const username = localStorage.getItem('username');

const sidebarUsernameEl = document.getElementById('sidebarUsername');
if (sidebarUsernameEl && username) {
    sidebarUsernameEl.textContent = '@' + username;
}

if (!token) {
    console.warn("No hay token, redirigiendo...");
    window.location.href = 'login.html';
}

// Variables Globales
const form = document.getElementById('actividadForm');
const tabla = document.getElementById('tablaActividades');
const loading = document.getElementById('loading');
const seccionCrear = document.getElementById('seccionCrear');
let actividadesActuales = [];
let miembrosActuales = []; 

// --- FILTRO POR SEMESTRE ---
function getCurrentSemester() {
    return new Date().getMonth() < 6 ? 1 : 2;
}
let filtroSemestre = {
    anio: new Date().getFullYear(),
    sem: getCurrentSemester()
};


// Ocultar formulario a invitados
if (seccionCrear && userRol !== 'admin') {
    seccionCrear.style.display = 'none';
}

// --- 2. SISTEMA DE LOGOUT ---
const btnSalir = document.getElementById('btnSalir');
if (btnSalir) {
    btnSalir.addEventListener('click', () => {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: '¿Cerrar sesión?', text: "Tendrás que ingresar nuevamente", icon: 'question',
                showCancelButton: true, confirmButtonColor: '#3085d6', cancelButtonColor: '#d33', confirmButtonText: 'Sí, salir'
            }).then((result) => { if (result.isConfirmed) ejecutarSalida(); });
        } else {
            if (confirm("¿Deseas cerrar sesión?")) ejecutarSalida();
        }
    });
}
function ejecutarSalida() {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

// --- 3. NAVEGACIÓN (LOGICA SIDEBAR SAAS) ---

// Mostrar el menú si el usuario existe
const navAdmin = document.getElementById('navAdmin');
if (navAdmin) navAdmin.style.display = 'flex'; // En el CSS del sidebar esto es flex-direction: column

// Ocultar botón de usuarios si no es admin
const btnUsuarios = document.getElementById('btnUsuarios');
if (userRol !== 'admin' && btnUsuarios) btnUsuarios.style.display = 'none';

window.cambiarVista = (vista) => {
    // ---------------------------------------------
    // 1. GESTIÓN VISUAL (UI)
    // ---------------------------------------------

    // A. Ocultar TODAS las vistas (contenedores principales)
    const vistas = ['vistaPlanner', 'vistaUsuarios', 'vistaMiembros', 'vistaEquipo', 'vistaFinanzas', 'vistaCalendario'];
    vistas.forEach(id => {
        const el = document.getElementById(id);
        if(el) el.style.display = 'none';
    });

    // B. Resetear el menú: Quitar la clase 'active' de TODOS los botones
    const botonesMenu = document.querySelectorAll('.nav-link');
    botonesMenu.forEach(btn => {
        btn.classList.remove('active');
    });

    // C. Activar el botón seleccionado (Ponerlo azul)
    // Construimos el ID dinámicamente: 'btn' + PrimeraLetraMayuscula + resto
    const idBotonActual = 'btn' + vista.charAt(0).toUpperCase() + vista.slice(1);
    const botonActual = document.getElementById(idBotonActual);
    if (botonActual) {
        botonActual.classList.add('active');
    }

    // ---------------------------------------------
    // 2. LÓGICA POR MÓDULO
    // ---------------------------------------------

    if (vista === 'planner') {
        document.getElementById('vistaPlanner').style.display = 'block';
        // Recargamos widgets por si hubo cambios
        if(typeof cargarCumpleaneros === 'function') cargarCumpleaneros();
        cargarActividades(); 
    } 
    else if (vista === 'usuarios') {
        if (userRol !== 'admin') return; 
        document.getElementById('vistaUsuarios').style.display = 'block';
        cargarUsuarios(); 
    } 
    else if (vista === 'miembros') {
        document.getElementById('vistaMiembros').style.display = 'block';
        cargarMiembros();
    }
    else if (vista === 'equipo') {
        document.getElementById('vistaEquipo').style.display = 'block';
        cargarEquipo();
    }
    else if (vista === 'finanzas') {
        // Validación estricta de Admin
        if (userRol !== 'admin') {
            Swal.fire({
                icon: 'warning',
                title: 'Acceso Restringido',
                text: 'Solo los administradores pueden ver el módulo financiero.'
            });
            // Si intenta entrar sin permiso, lo devolvemos al planner
            cambiarVista('planner');
            return;
        }
        
        document.getElementById('vistaFinanzas').style.display = 'block';
        
        // Carga segura del módulo externo
        if (typeof cargarDashboardFinanzas === 'function') {
            cargarDashboardFinanzas();
        } else {
            console.error("⚠️ finance.js no está cargado.");
            document.getElementById('vistaFinanzas').innerHTML = '<div class="alert alert-danger">Error cargando módulo financiero.</div>';
        }
    }
    
    // En móviles, cerrar el sidebar automáticamente al seleccionar una opción
    const sidebar = document.querySelector('.sidebar');
    if(sidebar && sidebar.classList.contains('show') && window.innerWidth < 768) {
        sidebar.classList.remove('show');
    }
    else if (vista === 'calendario') {
        document.getElementById('vistaCalendario').style.display = 'block';
        // Llamamos a la función que está en calendar.js
        if (typeof cargarCalendario === 'function') {
            cargarCalendario();
        }
    }
};

async function cargarUsuarios() {
    const tbody = document.getElementById('tablaUsuarios');
    const noData = document.getElementById('noUsuarios');
    if (!tbody) return;

    // Loader visual
    tbody.innerHTML = '';
    if(noData) noData.style.display = 'block';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/usuarios', { headers: { 'Authorization': token } });
        const usuarios = await res.json();
        
        if(noData) noData.style.display = 'none';
        tbody.innerHTML = '';

        usuarios.forEach(u => {
            // Estilos según rol
            const esAdmin = u.rol === 'admin';
            const badgeClass = esAdmin ? 'bg-primary bg-opacity-10 text-primary' : 'bg-secondary bg-opacity-10 text-secondary';
            const iconRol = esAdmin ? '<i class="bi bi-shield-fill me-1"></i>' : '<i class="bi bi-eye-fill me-1"></i>';

            // Avatar Generado
            const inicial = u.username.charAt(0).toUpperCase();
            const bgAvatar = esAdmin ? '#eff6ff' : '#f3f4f6'; // Azulito o Gris
            const colorAvatar = esAdmin ? '#2563eb' : '#4b5563';

            // Estado
            const isActivo = u.activo !== false;
            const estadoHtml = isActivo 
                ? `<div class="d-flex align-items-center text-success small fw-bold"><i class="bi bi-dot fs-3 me-n1"></i> Activo</div>`
                : `<div class="d-flex align-items-center text-danger small fw-bold"><i class="bi bi-dot fs-3 me-n1"></i> Inactivo</div>`;
            
            // Botón de estado
            const btnEstado = isActivo
                ? `<button onclick="toggleEstadoUsuario(${u.id}, false)" class="btn btn-sm btn-light border text-secondary shadow-sm me-1" title="Desactivar Usuario"><i class="bi bi-person-x-fill"></i></button>`
                : `<button onclick="toggleEstadoUsuario(${u.id}, true)" class="btn btn-sm btn-light border text-success shadow-sm me-1" title="Activar Usuario"><i class="bi bi-person-check-fill"></i></button>`;

            tbody.innerHTML += `
                <tr>
                    <td class="ps-4">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 shadow-sm" 
                                 style="width: 40px; height: 40px; background-color: ${bgAvatar}; color: ${colorAvatar};">
                                ${inicial}
                            </div>
                            <div>
                                <div class="fw-bold text-dark">@${u.username}</div>
                                <div class="small text-muted" style="font-size: 0.75rem;">ID: #${u.id}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <span class="badge ${badgeClass} border border-opacity-10 rounded-pill px-3 py-2">
                            ${iconRol} ${u.rol.toUpperCase()}
                        </span>
                    </td>
                    <td>
                        ${estadoHtml}
                    </td>
                    <td class="text-end pe-4">
    <button onclick="abrirModalPassword(${u.id}, '${u.username}')" 
            class="btn btn-sm btn-light border text-warning shadow-sm me-1" 
            title="Cambiar Contraseña">
        <i class="bi bi-key-fill"></i>
    </button>
    ${btnEstado}
    <button onclick="eliminarUsuario(${u.id})" 
            class="btn btn-sm btn-light border text-danger shadow-sm" 
            title="Revocar Acceso">
        <i class="bi bi-trash-fill"></i>
    </button>
</td>
                </tr>
            `;
        });

    } catch (error) {
        console.error(error);
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-4">Error de conexión</td></tr>`;
    }
}

// 2. ABRIR MODAL (Función auxiliar)
window.abrirModalUsuario = () => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    document.getElementById('formCrearUsuario').reset();
    new bootstrap.Modal(document.getElementById('modalUsuario')).show();
}

// 3. CREAR USUARIO (Nueva Lógica con Modal)
const formCrearUsuario = document.getElementById('formCrearUsuario');
if (formCrearUsuario) {
    formCrearUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('usrNombre').value;
        const password = document.getElementById('usrPass').value;
        const rol = document.getElementById('usrRol').value;
        const btn = formCrearUsuario.querySelector('button');

        const textoOriginal = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creando...';

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/usuarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ username, password, rol })
            });

            const data = await res.json();

            if (res.ok) {
                // Cerrar modal
                const modalEl = document.getElementById('modalUsuario');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();
                
                // Recargar y notificar
                cargarUsuarios();
                Swal.fire({ icon: 'success', title: 'Usuario Creado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            } else {
                Swal.fire('Error', data.error || 'No se pudo crear', 'error');
            }
        } catch (error) {
            Swal.fire('Error', 'Fallo de conexión', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    });
}

// 4. ELIMINAR USUARIO (Mantener lógica existente)
window.eliminarUsuario = async (id) => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    const confirm = await Swal.fire({
        title: '¿Revocar acceso?',
        text: "Este usuario ya no podrá iniciar sesión.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    });

    if (confirm.isConfirmed) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/usuarios/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            cargarUsuarios();
            Swal.fire('Eliminado', 'El acceso ha sido revocado.', 'success');
        } catch (e) {
            Swal.fire('Error', 'No se pudo eliminar', 'error');
        }
    }
};

window.toggleEstadoUsuario = async (id, nuevoEstado) => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos.', 'error'); return; }
    
    const token = localStorage.getItem('token');
    try {
        const res = await fetch(`/api/usuarios/${id}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ activo: nuevoEstado })
        });
        if (res.ok) {
            cargarUsuarios();
            Swal.fire({
                icon: 'success', 
                title: nuevoEstado ? 'Usuario Activado' : 'Usuario Desactivado', 
                toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 
            });
        } else {
            const errData = await res.json();
            Swal.fire('Error', errData.error || 'No se pudo cambiar el estado', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'Fallo de conexión', 'error');
    }
};

window.resetPassword = async (id, username) => {
    const { value: newPassword } = await Swal.fire({
        title: `Nueva clave para: ${username}`,
        input: 'password',
        inputLabel: 'Ingresa la nueva clave',
        inputPlaceholder: 'Mínimo 4 caracteres',
        showCancelButton: true,
        confirmButtonText: 'Actualizar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#ffc107',
        inputAttributes: { autocapitalize: 'off' }
    });

    if (newPassword) {
        try {
            const res = await fetch(`/api/usuarios/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify({ password: newPassword })
            });
            if (res.ok) Swal.fire('¡Listo!', 'Contraseña actualizada.', 'success');
            else Swal.fire('Error', 'No se pudo actualizar.', 'error');
        } catch (error) { Swal.fire('Error', 'Fallo de conexión.', 'error'); }
    }
};

const formUsuario = document.getElementById('usuarioForm');
if(formUsuario) {
    formUsuario.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('newUsername').value;
        const password = document.getElementById('newPassword').value;
        const rol = document.getElementById('newRol').value;
        const res = await fetch('/api/usuarios', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': token }, body: JSON.stringify({ username, password, rol })
        });
        if (res.ok) { Swal.fire('Creado', '', 'success'); formUsuario.reset(); cargarUsuarios(); }
        else { Swal.fire('Error', 'Fallo al crear', 'error'); }
    });
}

window.eliminarUsuario = async (id) => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    if(confirm("¿Eliminar usuario?")) {
        await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
        cargarUsuarios();
    }
};
// 4. ABRIR MODAL DE PASSWORD
window.abrirModalPassword = (id, username) => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    // 1. Guardamos el ID en el input oculto
    document.getElementById('idUsuarioPass').value = id;
    // 2. Mostramos el nombre para que sepa a quién edita
    document.getElementById('lblUsuarioPass').innerText = '@' + username;
    // 3. Limpiamos el campo de texto
    document.getElementById('newPassword').value = '';
    
    // 4. Mostramos el modal
    new bootstrap.Modal(document.getElementById('modalPassword')).show();
}

// 5. PROCESAR EL CAMBIO DE PASSWORD
const formEditarPass = document.getElementById('formEditarPass');
if (formEditarPass) {
    formEditarPass.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('idUsuarioPass').value;
        const newPassword = document.getElementById('newPassword').value;
        const btn = formEditarPass.querySelector('button');

        // Feedback visual de carga
        const textoOriginal = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

        try {
            const token = localStorage.getItem('token');
            // OJO: Asegúrate que tu backend tenga esta ruta (PUT /api/usuarios/:id)
            const res = await fetch(`/api/usuarios/${id}`, {
                method: 'PUT', // O 'PATCH' dependiendo de tu backend
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': token 
                },
                body: JSON.stringify({ password: newPassword }) 
            });

            const data = await res.json();

            if (res.ok) {
                // Cerrar modal
                const modalEl = document.getElementById('modalPassword');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();

                Swal.fire({
                    icon: 'success',
                    title: 'Contraseña Actualizada',
                    text: 'El usuario podrá ingresar con la nueva clave.',
                    timer: 2500,
                    showConfirmButton: false
                });
            } else {
                Swal.fire('Error', data.error || 'No se pudo actualizar', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error de conexión con el servidor', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    });
}
// --- 5. LÓGICA DE ACTIVIDADES ---
function calcularTiempoRestante(fechaFutura) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const futuro = new Date(fechaFutura);
    const futuroAjustado = new Date(futuro.getTime() + futuro.getTimezoneOffset() * 60000);
    const dias = Math.ceil((futuroAjustado - hoy) / (1000 * 60 * 60 * 24));
    if (dias < 0) return { texto: `Paso hace ${Math.abs(dias)} dias`, color: 'text-muted' };
    if (dias === 0) return { texto: 'Es hoy', color: 'text-danger fw-bold' };
    if (dias === 1) return { texto: 'Manana', color: 'text-warning fw-bold' };
    return { texto: `Faltan ${dias} dias`, color: 'text-primary' };
}

function renderActividadItem(item) {
    const f = new Date(item.fecha);
    const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
    const dia   = String(fUser.getDate()).padStart(2, '0');
    const mes   = fUser.toLocaleDateString('es-ES', { month: 'short' });
    const anio  = fUser.getFullYear();

    // Calcular diferencia de dias
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const fCopy = new Date(fUser); fCopy.setHours(0, 0, 0, 0);
    const diasDiff = Math.ceil((fCopy - hoy) / (1000 * 60 * 60 * 24));

    // Color de acento y clase de pill segun estado
    let accentColor, pillClass, badgeText;
    if (item.completado) {
        accentColor = '#22c55e'; pillClass = 'pill-green'; badgeText = 'Completado';
    } else if (diasDiff < 0) {
        accentColor = '#e2e8f0'; pillClass = 'pill-gray';
        badgeText = `Paso hace ${Math.abs(diasDiff)} d`;
    } else if (diasDiff === 0) {
        accentColor = '#ef4444'; pillClass = 'pill-red'; badgeText = 'Hoy';
    } else if (diasDiff === 1) {
        accentColor = '#f97316'; pillClass = 'pill-orange'; badgeText = 'Manana';
    } else if (diasDiff <= 14) {
        accentColor = '#3b82f6'; pillClass = 'pill-blue'; badgeText = `${diasDiff} dias`;
    } else {
        accentColor = '#a5b4fc'; pillClass = 'pill-indigo'; badgeText = `${diasDiff} dias`;
    }

    // Botones de accion
    let acciones = '';
    if (userRol === 'admin') {
        const iconoCheck = item.completado ? 'bi-check-circle-fill text-success' : 'bi-circle text-secondary';
        acciones = `
            <div class="activity-btn-group">
                <button onclick="abrirModalEditar(${item.id})" class="btn btn-sm btn-light border" title="Editar">
                    <i class="bi bi-pencil text-primary"></i>
                </button>
                <button onclick="cambiarEstado(${item.id}, ${!item.completado})" class="btn btn-sm btn-light border" title="${item.completado ? 'Marcar pendiente' : 'Completar'}">
                    <i class="bi ${iconoCheck}"></i>
                </button>
                <button onclick="eliminarActividad(${item.id})" class="btn btn-sm btn-light border" title="Eliminar">
                    <i class="bi bi-trash text-danger"></i>
                </button>
            </div>`;
    } else {
        acciones = item.completado
            ? `<span class="activity-time-pill pill-green">Listo</span>`
            : `<span class="activity-time-pill pill-gray">Pendiente</span>`;
    }

    return `
        <div class="activity-item ${item.completado ? 'is-completado' : ''}">
            <div class="activity-accent" style="background-color: ${accentColor};"></div>
            <div class="activity-date-block">
                <span class="activity-day-num">${dia}</span>
                <span class="activity-month-lbl">${mes}</span>
                <span class="activity-year-lbl">${anio}</span>
            </div>
            <div class="activity-divider"></div>
            <div class="activity-info">
                <div class="activity-name">${item.actividad}</div>
                <div class="activity-detail-text">${item.detalles || '<span style="color:#e2e8f0;">Sin detalles</span>'}</div>
            </div>
            <span class="activity-time-pill ${pillClass}">${badgeText}</span>
            ${acciones}
        </div>`;
}

async function cargarActividades() {
    if(!tabla) return;
    loading.style.display = 'block';
    tabla.innerHTML = '';
    try {
        const res = await fetch('/api/actividades', { headers: { 'Authorization': token } });
        if (res.status === 401 || res.status === 403) { ejecutarSalida(); return; }
        const datos = await res.json();
        actividadesActuales = datos;

        // Aplicar filtro de semestre
        const filtradas = filtrarPorSemestre(datos);
        actualizarKPIs(filtradas);
        actualizarUIFiltro();
        inicializarHero();

        // Actualizar subtitulo de la tabla
        const subtitulo = document.getElementById('subtituloActividades');
        if (subtitulo) {
            if (filtroSemestre.sem === 0) {
                subtitulo.textContent = `${filtradas.length} actividades en total`;
            } else {
                const semNombre = filtroSemestre.sem === 1 ? 'Enero - Junio' : 'Julio - Diciembre';
                subtitulo.textContent = `${filtradas.length} actividades · ${semNombre} ${filtroSemestre.anio}`;
            }
        }

        if(filtradas.length === 0) {
            tabla.innerHTML = '<div class="text-center py-5 text-muted"><i class="bi bi-calendar-x fs-1 opacity-25 d-block mb-2"></i>Sin actividades en este periodo</div>';
            return;
        }
        let html = '';
        filtradas.forEach(item => { html += renderActividadItem(item); });
        tabla.innerHTML = html;
    } catch (error) { console.error(error); } finally { loading.style.display = 'none'; }
}

// --- FUNCIONES DEL FILTRO POR SEMESTRE ---
function filtrarPorSemestre(actividades) {
    if (filtroSemestre.sem === 0) return actividades;
    const inicioMes = filtroSemestre.sem === 1 ? 0 : 6;
    const finMes    = filtroSemestre.sem === 1 ? 5 : 11;
    return actividades.filter(item => {
        const f = new Date(item.fecha);
        const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
        return fUser.getFullYear() === filtroSemestre.anio &&
               fUser.getMonth() >= inicioMes &&
               fUser.getMonth() <= finMes;
    });
}

function actualizarKPIs(actividades) {
    const total       = actividades.length;
    const completadas = actividades.filter(a => a.completado).length;
    const pendientes  = total - completadas;

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    let proximaDias = null;
    actividades
        .filter(a => !a.completado)
        .forEach(a => {
            const f = new Date(a.fecha);
            const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
            const dias = Math.ceil((fUser - hoy) / (1000 * 60 * 60 * 24));
            if (dias >= 0 && (proximaDias === null || dias < proximaDias)) proximaDias = dias;
        });

    const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setEl('kpiTotal',       total);
    setEl('kpiCompletadas', completadas);
    setEl('kpiPendientes',  pendientes);
    setEl('kpiProxima',     proximaDias !== null ? (proximaDias === 0 ? 'Hoy' : proximaDias + ' d') : '—');

    // Actualizar badge del hero
    const heroLabel = document.getElementById('heroSemestreLabel');
    if (heroLabel) {
        if (filtroSemestre.sem === 0) {
            heroLabel.textContent = 'Todos los periodos';
        } else {
            heroLabel.textContent = `Semestre ${filtroSemestre.sem} · ${filtroSemestre.anio}`;
        }
    }
}

function inicializarHero() {
    const heroSaludo = document.getElementById('heroSaludo');
    const heroFecha  = document.getElementById('heroFecha');
    if (heroSaludo) {
        const hora = new Date().getHours();
        let saludo = hora < 12 ? 'Buenos dias' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';
        try {
            const payload = JSON.parse(atob(localStorage.getItem('token').split('.')[1]));
            if (payload.username) saludo += ', ' + payload.username;
        } catch(e) { /* no interrumpir si falla el decode */ }
        heroSaludo.textContent = saludo;
    }
    if (heroFecha) {
        heroFecha.textContent = new Date().toLocaleDateString('es-ES', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
    }
}

function actualizarUIFiltro() {
    const lblAnio = document.getElementById('lblAnioFiltro');
    if (lblAnio) lblAnio.textContent = filtroSemestre.anio;

    ['btnSem0', 'btnSem1', 'btnSem2'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) btn.classList.remove('active');
    });
    const activeId = filtroSemestre.sem === 0 ? 'btnSem0' :
                     filtroSemestre.sem === 1 ? 'btnSem1' : 'btnSem2';
    const activeBtn = document.getElementById(activeId);
    if (activeBtn) activeBtn.classList.add('active');
}

window.cambiarAnioFiltro = (delta) => {
    filtroSemestre.anio += delta;
    cargarActividades();
};

window.cambiarSemestre = (sem) => {
    filtroSemestre.sem = sem;
    cargarActividades();
};


window.abrirModalEditar = (id) => {
    if (userRol !== 'admin') return;
    const item = actividadesActuales.find(a => a.id === id); if (!item) return;
    document.getElementById('editId').value = item.id;
    document.getElementById('editActividad').value = item.actividad;
    document.getElementById('editDetalles').value = item.detalles || '';
    const f = new Date(item.fecha); const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
    document.getElementById('editFecha').value = fUser.toISOString().split('T')[0];
    new bootstrap.Modal(document.getElementById('modalEditar')).show();
};

const formEditar = document.getElementById('formEditar');
if(formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const datos = { fecha: document.getElementById('editFecha').value, actividad: document.getElementById('editActividad').value, detalles: document.getElementById('editDetalles').value };
        await fetch(`/api/actividades/editar/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalEditar')).hide(); Swal.fire('Actualizado', '', 'success'); cargarActividades();
    });
}
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nueva = { fecha: document.getElementById('fecha').value, actividad: document.getElementById('actividad').value, detalles: document.getElementById('detalles').value };
        const btn = form.querySelector('button[type="submit"]');
        const textoOriginal = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando...';
        try {
            const res = await fetch('/api/actividades', { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(nueva) });
            if (res.ok) {
                const modalEl = document.getElementById('modalNuevaActividad');
                const modalInst = bootstrap.Modal.getInstance(modalEl);
                if (modalInst) modalInst.hide();
                form.reset();
                cargarActividades();
                Swal.fire({ icon: 'success', title: 'Actividad guardada', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            } else {
                const data = await res.json();
                Swal.fire('Error', data.error || 'No se pudo guardar', 'error');
            }
        } catch(err) {
            Swal.fire('Error', 'Fallo de conexion', 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = textoOriginal;
        }
    });
}

window.abrirModalNuevaActividad = () => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    const f = document.getElementById('actividadForm');
    if (f) f.reset();
    new bootstrap.Modal(document.getElementById('modalNuevaActividad')).show();
};
window.cambiarEstado = async (id, nuevoEstado) => {
    await fetch(`/api/actividades/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify({ completado: nuevoEstado }) });
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
    nuevoEstado ? Toast.fire({ icon: 'success', title: '¡Gloria a Dios!' }) : Toast.fire({ icon: 'info', title: 'Pendiente' }); cargarActividades();
};
window.eliminarActividad = async (id) => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    if ((await Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí' })).isConfirmed) {
        await fetch(`/api/actividades/${id}`, { method: 'DELETE', headers: { 'Authorization': token } }); cargarActividades(); Swal.fire('Eliminado', '', 'success');
    }
};

// --- 6. GESTIÓN DE MIEMBROS ---
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return "-";
    const hoy = new Date(); const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) { edad--; }
    return edad;
}
// ==========================================
// MÓDULO DE MIEMBROS (Lógica Full + Modales)
// ==========================================

let listaMiembrosCache = []; // Almacenamos aquí para editar sin volver a consultar la API

// 1. CARGAR Y RENDERIZAR MIEMBROS
async function cargarMiembros() {
    const tbody = document.getElementById('tablaMiembros');
    if (!tbody) return;

    // Spinner de carga mientras llegan los datos
    tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4"><div class="spinner-border text-primary"></div></td></tr>';

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/miembros', { headers: { 'Authorization': token } });
        if(!res.ok) throw new Error("Error al obtener miembros");
        
        listaMiembrosCache = await res.json(); // Guardamos en memoria
        renderizarTablaMiembros(listaMiembrosCache);
        
    } catch (error) {
        console.error(error);
        tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-3">Error cargando datos.</td></tr>`;
    }
}

// 2. RENDERIZAR TABLA (Con Avatares y Badges)
// 2. RENDERIZAR TABLA (DISEÑO PROFESIONAL: COLUMNAS + CHECKS)
function renderizarTablaMiembros(miembros) {
    const tbody = document.getElementById('tablaMiembros');
    const noResults = document.getElementById('noMiembros');
    tbody.innerHTML = '';

    if (!miembros || miembros.length === 0) {
        if(noResults) noResults.style.display = 'block';
        return;
    }
    if(noResults) noResults.style.display = 'none';

    miembros.forEach(m => {
        // Calcular Edad
        let edad = '-';
        if (m.fecha_nacimiento) {
            const hoy = new Date();
            const nac = new Date(m.fecha_nacimiento);
            edad = hoy.getFullYear() - nac.getFullYear();
            const mdiff = hoy.getMonth() - nac.getMonth();
            if (mdiff < 0 || (mdiff === 0 && hoy.getDate() < nac.getDate())) edad--;
        }

        // Avatar (Iniciales)
        const nombreArr = m.nombre.split(' ');
        const iniciales = (nombreArr[0][0] + (nombreArr[1] ? nombreArr[1][0] : '')).toUpperCase();
        
        // Colores consistentes
        const colores = ['#ebf8ff', '#f0fdf4', '#fef2f2', '#fff7ed', '#f3f4f6'];
        const coloresTxt = ['#0369a1', '#15803d', '#b91c1c', '#c2410c', '#4b5563'];
        const colorIdx = m.id % colores.length;

        // --- ICONOS PROFESIONALES (Check / X) ---
        // Usamos bi-check-lg (Check grande) y bi-x-lg (X grande)
        // El 'text-opacity-25' en la X hace que se vea sutil y no agresiva.
        
        const checkIcon = `<i class="bi bi-check-lg text-success fs-5 fw-bold"></i>`;
        const xIcon = `<i class="bi bi-x-lg text-secondary opacity-25 fs-6"></i>`;

        const estadoBautizo = m.bautizado ? checkIcon : xIcon;
        const estadoConfirm = m.confirmado ? checkIcon : xIcon;

        // --- RENDERIZADO DE FILA ---
        tbody.innerHTML += `
            <tr>
                <td class="ps-4">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 flex-shrink-0" 
                             style="width: 40px; height: 40px; background-color: ${colores[colorIdx]}; color: ${coloresTxt[colorIdx]}; font-size: 0.85rem;">
                            ${iniciales}
                        </div>
                        <div>
                            <div class="fw-bold text-dark">${m.nombre}</div>
                            <div class="small text-muted">${edad} años</div>
                        </div>
                    </div>
                </td>
                <td><span class="text-secondary fw-medium">${m.congregacion || 'General'}</span></td>
                
                <td class="text-center">${estadoBautizo}</td>
                
                <td class="text-center">${estadoConfirm}</td>

                <td class="text-end pe-4">
                    <button onclick="prepararEdicionMiembro(${m.id})" class="btn btn-sm btn-light border text-primary shadow-sm" title="Editar"><i class="bi bi-pencil-square"></i></button>
                    <button onclick="eliminarMiembro(${m.id})" class="btn btn-sm btn-light border text-danger shadow-sm ms-1" title="Eliminar"><i class="bi bi-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

// 3. LOGICA DE AGREGAR (CORREGIDA)
const formCrearMiembro = document.getElementById('miembroForm');
if (formCrearMiembro) {
    formCrearMiembro.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const nuevoMiembro = {
            nombre: document.getElementById('mNombre').value,
            fecha_nacimiento: document.getElementById('mFecha').value,
            congregacion: document.getElementById('mCongregacion').value,
            bautizado: document.getElementById('mBautizado').checked,
            confirmado: document.getElementById('mConfirmado').checked
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/miembros', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify(nuevoMiembro)
            });

            if (res.ok) {
                // 1. Cerrar Modal
                const modalEl = document.getElementById('modalCrearMiembro');
                const modalInstance = bootstrap.Modal.getInstance(modalEl);
                if(modalInstance) modalInstance.hide();
                
                // 2. Limpiar formulario
                formCrearMiembro.reset();
                
                // 3. Recargar tabla y notificar
                cargarMiembros();
                if(typeof cargarCumpleaneros === 'function') cargarCumpleaneros(); // Actualizar widget cumpleaños también
                Swal.fire({ icon: 'success', title: 'Miembro Registrado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            } else {
                Swal.fire('Error', 'No se pudo guardar', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    });
}

// 4. LOGICA DE EDITAR (CORREGIDA)
// A. Abrir Modal de Creación (Manual para evitar error de backdrop)
window.abrirModalCrearMiembro = () => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    // 1. Limpiamos el formulario por si quedaron datos viejos
    const form = document.getElementById('miembroForm');
    if(form) form.reset();

    // 2. Abrimos el modal manualmente
    const modalEl = document.getElementById('modalCrearMiembro');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};
// A. Abrir el modal con los datos cargados
window.prepararEdicionMiembro = (id) => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    // Buscar en caché (más rápido que llamar a la API de nuevo)
    const m = listaMiembrosCache.find(x => x.id === id);
    if (!m) return;

    // Llenar campos del modal de edición
    document.getElementById('editMemId').value = m.id;
    document.getElementById('editMemNombre').value = m.nombre;
    document.getElementById('editMemCongregacion').value = m.congregacion;
    document.getElementById('editMemBautizado').checked = m.bautizado;
    document.getElementById('editMemConfirmado').checked = m.confirmado;

    // Formatear fecha para el input type="date" (YYYY-MM-DD)
    if (m.fecha_nacimiento) {
        const fechaISO = new Date(m.fecha_nacimiento).toISOString().split('T')[0];
        document.getElementById('editMemFecha').value = fechaISO;
    }

    // Mostrar Modal (Bootstrap 5)
    const modalEl = document.getElementById('modalEditarMiembro');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
};

// B. Guardar los cambios
const formEditarMiembro = document.getElementById('formEditarMiembro');
if (formEditarMiembro) {
    formEditarMiembro.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('editMemId').value;
        const datosActualizados = {
            nombre: document.getElementById('editMemNombre').value,
            fecha_nacimiento: document.getElementById('editMemFecha').value,
            congregacion: document.getElementById('editMemCongregacion').value,
            bautizado: document.getElementById('editMemBautizado').checked,
            confirmado: document.getElementById('editMemConfirmado').checked
        };

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/miembros/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify(datosActualizados)
            });

            if (res.ok) {
                // Cerrar modal
                const modalEl = document.getElementById('modalEditarMiembro');
                const modal = bootstrap.Modal.getInstance(modalEl); // Obtener instancia existente
                if(modal) modal.hide();

                // Recargar
                cargarMiembros();
                if(typeof cargarCumpleaneros === 'function') cargarCumpleaneros();
                
                Swal.fire({ icon: 'success', title: 'Datos Actualizados', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
            } else {
                Swal.fire('Error', 'No se pudo actualizar', 'error');
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'Error de conexión', 'error');
        }
    });
}

// 5. LOGICA DE ELIMINAR (Ya funcionaba, pero la incluimos para mantener todo junto)
window.eliminarMiembro = async (id) => {
    if (userRol !== 'admin') { Swal.fire('Acceso denegado', 'No tienes permisos para realizar esta acción.', 'error'); return; }
    const result = await Swal.fire({
        title: '¿Estás seguro?',
        text: "Se eliminará permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const token = localStorage.getItem('token');
            await fetch(`/api/miembros/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': token }
            });
            cargarMiembros();
            if(typeof cargarCumpleaneros === 'function') cargarCumpleaneros();
            Swal.fire('Eliminado', 'El registro ha sido borrado.', 'success');
        } catch (error) {
            Swal.fire('Error', 'No se pudo eliminar', 'error');
        }
    }
};

// 6. BUSCADOR EN TIEMPO REAL
window.filtrarMiembros = () => {
    const texto = document.getElementById('busquedaMiembro').value.toLowerCase();
    const filtrados = listaMiembrosCache.filter(m => 
        m.nombre.toLowerCase().includes(texto) || 
        (m.congregacion && m.congregacion.toLowerCase().includes(texto))
    );
    renderizarTablaMiembros(filtrados);
};

// --- 7. EQUIPO PASTORAL ---
async function cargarEquipo() {
    const contenedor = document.getElementById('contenedorEquipo'); if(!contenedor) return;
    contenedor.innerHTML = '<div class="spinner-border text-primary"></div>';
    try {
        const res = await fetch('/api/equipo'); const data = await res.json(); contenedor.innerHTML = '';
        const niveles = { 1: { titulo: '', color: 'border-warning border-3', bg: 'bg-warning', icon: 'bi-star-fill text-warning' }, 2: { titulo: '', color: 'border-primary border-2', bg: 'bg-white', icon: 'bi-shield-fill text-primary' }, 3: { titulo: 'Directiva', color: 'border-secondary', bg: 'bg-white', icon: 'bi-briefcase-fill text-secondary' }, 4: { titulo: 'Coordinadores', color: 'border-success', bg: 'bg-white', icon: 'bi-people-fill text-success' }, 5: { titulo: 'Vocales', color: 'border-info', bg: 'bg-white', icon: 'bi-mic-fill text-info' }, 6: { titulo: 'Soporte y Logística', color: 'border-dark', bg: 'bg-light', icon: 'bi-tools text-dark' } };
        for (let i = 1; i <= 6; i++) {
            const grupo = data.filter(d => d.nivel === i); if(grupo.length === 0) continue; const estilo = niveles[i];
            let htmlFila = `<div class="row g-4 justify-content-center w-100 animate__animated animate__fadeInUp">`;
            if(estilo.titulo) htmlFila += `<h6 class="text-muted text-uppercase small fw-bold mt-4 mb-2 border-bottom pb-2 w-75 text-center">${estilo.titulo}</h6>`;
            grupo.forEach(item => {
                const btnEdit = userRol === 'admin' ? `<button onclick="editarCargo(${item.id}, '${item.cargo}', '${item.nombre}')" class="btn btn-sm btn-light border position-absolute top-0 end-0 m-2"><i class="bi bi-pencil-fill small"></i></button>` : '';
                let colSize = '3'; if (grupo.length === 1) colSize = '6'; if (grupo.length === 2) colSize = '5'; if (grupo.length === 3) colSize = '4';
                htmlFila += `<div class="col-md-${colSize}"><div class="card h-100 shadow-sm ${estilo.color} position-relative text-center">${btnEdit}<div class="card-body"><div class="mb-3"><i class="bi ${estilo.icon} fs-1"></i></div><h6 class="card-subtitle mb-2 text-muted text-uppercase small fw-bold">${item.cargo}</h6><h5 class="card-title fw-bold text-dark mb-0">${item.nombre}</h5></div></div></div>`;
            });
            htmlFila += `</div>`; contenedor.innerHTML += htmlFila;
        }
    } catch (error) { console.error(error); }
}
window.editarCargo = async (id, cargo, nombreActual) => {
    if(userRol !== 'admin') return;
    const { value: nuevoNombre } = await Swal.fire({ title: `Asignar: ${cargo}`, input: 'text', inputValue: nombreActual === 'Por asignar' ? '' : nombreActual, showCancelButton: true, confirmButtonText: 'Guardar', cancelButtonText: 'Cancelar' });
    if (nuevoNombre) { await fetch(`/api/equipo/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': token }, body: JSON.stringify({ nombre: nuevoNombre }) }); Swal.fire('Asignado', '', 'success'); cargarEquipo(); }
};

// --- 8. CUMPLEAÑEROS DEL MES (MEJORADO: NOMBRE COMPLETO) ---
async function cargarCumpleaneros() {
    const contenedor = document.getElementById('listaCumpleaneros');
    const seccion = document.getElementById('seccionCumpleaneros');
    const emptyState = document.getElementById('noBirthdays');

    if (!contenedor || !seccion || !emptyState) return;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/miembros', { headers: { 'Authorization': token } });
        const miembros = await res.json();
        
        const hoy = new Date();
        const mesActual = hoy.getMonth();
        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        const cumplenEsteMes = miembros.filter(m => {
            if (!m.fecha_nacimiento) return false;
            const partes = new Date(m.fecha_nacimiento).toISOString().split('T')[0].split('-'); 
            const mesNac = parseInt(partes[1]) - 1;
            return mesNac === mesActual;
        });

        // Toggle visibilidad
        if (cumplenEsteMes.length === 0) {
            seccion.style.display = 'none';
            emptyState.style.display = 'flex';
            emptyState.classList.add('d-flex');
        } else {
            seccion.style.display = 'block';
            emptyState.style.display = 'none';
            emptyState.classList.remove('d-flex');
        }

        if (cumplenEsteMes.length > 0) {
            cumplenEsteMes.sort((a, b) => {
                const diaA = parseInt(new Date(a.fecha_nacimiento).toISOString().split('T')[0].split('-')[2]);
                const diaB = parseInt(new Date(b.fecha_nacimiento).toISOString().split('T')[0].split('-')[2]);
                return diaA - diaB;
            });

            contenedor.innerHTML = '';
            cumplenEsteMes.forEach(m => {
                const fecha = new Date(m.fecha_nacimiento).toISOString().split('T')[0].split('-');
                const dia = fecha[2];
                const anioNac = parseInt(fecha[0]);
                const edad = hoy.getFullYear() - anioNac;
                
                // CAMBIO 1: Usamos el nombre completo sin cortar
                const nombreCompleto = m.nombre; 

                // CAMBIO 2: Diseño flexible (sin text-truncate y sin max-width fijo)
                // Usamos 'lh-sm' para que si el nombre cae en 2 líneas, no se vea separado.
            contenedor.innerHTML += `
                <div class="birthday-chip">
                    <span class="birthday-chip-day">${dia}</span>
                    <span>${nombreCompleto} &middot; ${edad} a&ntilde;os</span>
                </div>
            `;
            });
        }

    } catch (error) {
        console.error("Error cargando cumpleaños:", error);
    }
}

// --- 9. GENERAR PDF (CORREGIDO: DIBUJO DE ESTADOS) ---
window.generarPDF = async () => {
    if (!window.jspdf) {
        Swal.fire('Error', 'Librerías PDF no cargadas.', 'error');
        return;
    }

    // Feedback visual porque la carga de imagen puede tomar milisegundos extra
    Swal.fire({
        title: 'Generando PDF',
        text: 'Por favor espera un momento...',
        allowOutsideClick: false,
        didOpen: () => { Swal.showLoading(); }
    });

    const { jsPDF } = window.jspdf;
    // Formato Carta
    const doc = new jsPDF({ format: 'letter' }); 

    // --- COLORES MODERNOS ---
    const primary = [79, 70, 229]; // Indigo-600 #4f46e5
    const textMain = [15, 23, 42]; // Slate-900 #0f172a
    const textMuted = [100, 116, 139]; // Slate-500 #64748b
    const bgLight = [248, 250, 252]; // Slate-50 #f8fafc
    const border = [226, 232, 240]; // Slate-200 #e2e8f0
    const green = [22, 163, 74]; // Green-600
    const orange = [234, 88, 12]; // Orange-600

    const margin = 14;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);

    // --- CARGAR LOGO (Conversión SVG a PNG on-the-fly) ---
    const logoData = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const scale = 3; // Escalamos para que el PNG tenga buena resolución
            canvas.width = img.width * scale || 300;
            canvas.height = img.height * scale || 300;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve({ url: canvas.toDataURL('image/png'), aspect: img.width / img.height });
        };
        img.onerror = () => {
            console.warn("No se pudo cargar el logo para el PDF");
            resolve(null);
        };
        img.src = '/img/LogoICLEB.svg';
    });

    // --- 1. ENCABEZADO MODERNO ---
    // Acento superior
    doc.setFillColor(...primary);
    doc.rect(0, 0, pageWidth, 6, 'F');

    let textStartX = margin;

    // Dibujar logo si cargó
    if (logoData) {
        const logoH = 16;
        const logoW = logoH * (logoData.aspect || 1);
        doc.addImage(logoData.url, 'PNG', margin, 12, logoW, logoH);
        textStartX = margin + logoW + 4; // Empujar el texto a la derecha
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...textMain);
    doc.text("Plan de Actividades", textStartX, 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...textMuted);
    doc.text("El Buen Pastor - Iglesia Cristiana Luterana", textStartX, 28);

    const fechaImpresion = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    let periodoTexto = "Todos los periodos";
    if (filtroSemestre && filtroSemestre.sem !== 0) {
        periodoTexto = `Semestre ${filtroSemestre.sem} · ${filtroSemestre.anio}`;
    }

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...primary);
    doc.text(periodoTexto.toUpperCase(), pageWidth - margin, 22, { align: "right" });
    
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...textMuted);
    doc.text(`Generado: ${fechaImpresion}`, pageWidth - margin, 28, { align: "right" });

    // Línea divisoria
    doc.setDrawColor(...border);
    doc.setLineWidth(0.5);
    doc.line(margin, 34, pageWidth - margin, 34);

    // --- 2. RESUMEN (KPIs) ---
    const actividadesFiltradas = filtrarPorSemestre(actividadesActuales);
    const total = actividadesFiltradas.length;
    const completadas = actividadesFiltradas.filter(a => a.completado).length;
    const pendientes = total - completadas;

    const startY = 40;
    
    // Draw KPI Function
    const drawKpi = (x, label, value, color) => {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...border);
        doc.roundedRect(x, startY, 45, 18, 2, 2, 'FD'); // Box

        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...textMuted);
        doc.text(label.toUpperCase(), x + 4, startY + 6);
        
        doc.setFontSize(14);
        doc.setTextColor(...color);
        doc.text(String(value), x + 4, startY + 14);
    };

    drawKpi(margin, "Total", total, primary);
    drawKpi(margin + 50, "Completadas", completadas, green);
    drawKpi(margin + 100, "Pendientes", pendientes, orange);

    // --- 3. TABLA ---
    const datosOrdenados = [...actividadesFiltradas].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const cuerpoTabla = datosOrdenados.map(item => {
        const f = new Date(item.fecha);
        const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
        const fechaTexto = fUser.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        
        return [
            fechaTexto,
            item.actividad,
            item.detalles || '-',
            item.completado ? 'Completado' : 'Pendiente' 
        ];
    });

    doc.autoTable({
        startY: 66,
        head: [['FECHA', 'ACTIVIDAD', 'DETALLES', 'ESTADO']],
        body: cuerpoTabla,
        theme: 'plain',
        
        // Estilos Cabecera (Sólido y elegante)
        headStyles: { 
            fillColor: primary, // Fondo índigo fuerte
            textColor: 255,     // Texto blanco
            fontStyle: 'bold', 
            halign: 'left', 
            cellPadding: { top: 6, bottom: 6, left: 5, right: 5 },
            fontSize: 8
        },
        
        // Estilos Cuerpo (Limpio)
        styles: { 
            font: 'helvetica', 
            fontSize: 9, 
            cellPadding: { top: 6, bottom: 6, left: 5, right: 5 }, 
            valign: 'middle', 
            textColor: textMain,
            lineWidth: 0 // Sin bordes
        },

        // Filas intercaladas súper sutiles (Gris Slate-50)
        alternateRowStyles: {
            fillColor: [248, 250, 252] 
        },

        // Estilos por columna para jerarquía visual
        columnStyles: {
            0: { cellWidth: 28, fontStyle: 'normal', textColor: textMuted }, // Fecha más suave
            1: { cellWidth: 55, fontStyle: 'bold', textColor: textMain },    // Nombre fuerte
            2: { cellWidth: 'auto', textColor: textMuted },                  // Detalles suaves
            3: { cellWidth: 32, halign: 'center' }                           // Estado centrado
        },
        
        // --- 1. DIBUJO DE ESTADO TIPO "PILL" MEJORADO ---
        didDrawCell: function(data) {
            if (data.section === 'body' && data.column.index === 3) {
                const text = data.cell.raw;
                const isDone = text === 'Completado';
                
                // Colores pastel más vibrantes para el pill
                const pillColor = isDone ? [220, 252, 231] : [241, 245, 249]; // green-100 / slate-100
                const textColor = isDone ? [22, 163, 74] : [71, 85, 105];     // green-600 / slate-600
                const borderColor = isDone ? [134, 239, 172] : [203, 213, 225]; // green-300 / slate-300

                // Dimensiones pill
                const w = 24;
                const h = 6.5;
                const x = data.cell.x + (data.cell.width / 2) - (w / 2);
                const y = data.cell.y + (data.cell.height / 2) - (h / 2);
                
                // Dibujar pill
                doc.setFillColor(...pillColor);
                doc.setDrawColor(...borderColor);
                doc.setLineWidth(0.3);
                doc.roundedRect(x, y, w, h, 3, 3, 'FD');
                
                // Dibujar texto centrado perfecto
                doc.setFontSize(7);
                doc.setFont("helvetica", "bold");
                doc.setTextColor(...textColor);
                doc.text(text, x + (w/2), y + 4.5, { align: 'center' });
            }
        },
        
        // --- 2. LIMPIEZA DE TEXTO OCULTO ---
        willDrawCell: function(data) {
            if (data.section === 'body' && data.column.index === 3) {
                data.cell.text = ''; // Ocultamos el texto por defecto para dibujarlo nosotros
            }
        }
    });

    // --- 4. PIE DE PÁGINA ---
    const paginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setFontSize(7);
        doc.setTextColor(...textMuted);
        doc.text("Sistema de Planificación - Uso interno", margin, doc.internal.pageSize.height - margin);
        doc.text(`Página ${i} de ${paginas}`, pageWidth - margin, doc.internal.pageSize.height - margin, { align: "right" });
    }

    doc.save(`Planner_Semestre_${filtroSemestre.sem}_${filtroSemestre.anio}.pdf`);
    
    Swal.fire({
        icon: 'success',
        title: '¡PDF Generado!',
        text: 'La descarga comenzará automáticamente.',
        timer: 2000,
        showConfirmButton: false
    });
};
// === IMPORTANTE: AGREGAR ESTO AL FINAL DE TU SCRIPT ===
// Busca donde dice: // Carga Inicial
// Y agrega la llamada a cargarCumpleaneros();
// Carga Inicial
cargarActividades();
cargarCumpleaneros();