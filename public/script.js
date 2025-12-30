// --- 1. INICIO Y SEGURIDAD ---
console.log("Cargando sistema v5..."); 

const token = localStorage.getItem('token');
const userRol = localStorage.getItem('rol');

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
                title: '¿Cerrar sesión?',
                text: "Tendrás que ingresar nuevamente",
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#3085d6',
                cancelButtonColor: '#d33',
                confirmButtonText: 'Sí, salir'
            }).then((result) => {
                if (result.isConfirmed) ejecutarSalida();
            });
        } else {
            if (confirm("¿Deseas cerrar sesión?")) ejecutarSalida();
        }
    });
}

function ejecutarSalida() {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    window.location.href = 'login.html';
}

// --- 3. NAVEGACIÓN UNIFICADA (AQUÍ ESTABA EL ERROR) ---
const navAdmin = document.getElementById('navAdmin');
if (userRol === 'admin' && navAdmin) {
    navAdmin.style.display = 'flex';
}

window.cambiarVista = (vista) => {
    // 1. Elementos Botones
    const btnPlanner = document.getElementById('btnPlanner');
    const btnUsuarios = document.getElementById('btnUsuarios');
    const btnMiembros = document.getElementById('btnMiembros');
    const btnEquipo = document.getElementById('btnEquipo');

    // 2. Elementos Divs (Vistas)
    const divPlanner = document.getElementById('vistaPlanner');
    const divUsuarios = document.getElementById('vistaUsuarios');
    const divMiembros = document.getElementById('vistaMiembros');
    const divEquipo = document.getElementById('vistaEquipo');

    // 3. Resetear TODO (Ocultar divs y quitar azul a botones)
    if(divPlanner) divPlanner.style.display = 'none';
    if(divUsuarios) divUsuarios.style.display = 'none';
    if(divMiembros) divMiembros.style.display = 'none';
    if(divEquipo) divEquipo.style.display = 'none';

    if(btnPlanner) btnPlanner.classList.replace('btn-primary', 'btn-light');
    if(btnUsuarios) btnUsuarios.classList.replace('btn-primary', 'btn-light');
    if(btnMiembros) btnMiembros.classList.replace('btn-primary', 'btn-light');
    if(btnEquipo) btnEquipo.classList.replace('btn-primary', 'btn-light');

    // 4. Activar lo seleccionado
    if (vista === 'planner') {
        if(divPlanner) divPlanner.style.display = 'block';
        if(btnPlanner) btnPlanner.classList.replace('btn-light', 'btn-primary');
    } 
    else if (vista === 'usuarios') {
        if(divUsuarios) divUsuarios.style.display = 'block';
        if(btnUsuarios) btnUsuarios.classList.replace('btn-light', 'btn-primary');
        cargarUsuarios();
    } 
    else if (vista === 'miembros') {
        if(divMiembros) divMiembros.style.display = 'block';
        if(btnMiembros) btnMiembros.classList.replace('btn-light', 'btn-primary');
        cargarMiembros();
    }
    else if (vista === 'equipo') {
        if(divEquipo) divEquipo.style.display = 'block';
        if(btnEquipo) btnEquipo.classList.replace('btn-light', 'btn-primary');
        cargarEquipo();
    }
};

// --- 4. LÓGICA DE ACTIVIDADES ---
function calcularTiempoRestante(fechaFutura) {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const futuro = new Date(fechaFutura);
    const futuroAjustado = new Date(futuro.getTime() + futuro.getTimezoneOffset() * 60000);
    const diferenciaMs = futuroAjustado - hoy;
    const dias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

    if (dias < 0) return { texto: `Pasó hace ${Math.abs(dias)} días`, color: 'text-muted' };
    if (dias === 0) return { texto: '¡Es hoy!', color: 'text-danger fw-bold' };
    if (dias === 1) return { texto: 'Mañana', color: 'text-warning fw-bold' };
    return { texto: `Faltan ${dias} días`, color: 'text-primary' };
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
        
        if(datos.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No hay actividades</td></tr>';
            return;
        }

        datos.forEach(item => {
            const tiempo = calcularTiempoRestante(item.fecha);
            const estiloFila = item.completado ? 'opacity-50 text-decoration-line-through' : '';
            const fechaObj = new Date(item.fecha);
            const fechaUser = new Date(fechaObj.getTime() + fechaObj.getTimezoneOffset() * 60000);
            const fechaFormateada = fechaUser.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
            
            let botonesAccion = '';
            if (userRol === 'admin') {
                const iconoCheck = item.completado ? 'bi-check-circle-fill' : 'bi-circle';
                const claseBoton = item.completado ? 'btn-success' : 'btn-outline-secondary';
                botonesAccion = `
                    <div class="btn-group" role="group">
                        <button onclick="abrirModalEditar(${item.id})" class="btn btn-outline-primary btn-sm"><i class="bi bi-pencil-square"></i></button>
                        <button onclick="cambiarEstado(${item.id}, ${!item.completado})" class="btn ${claseBoton} btn-sm"><i class="bi ${iconoCheck}"></i></button>
                        <button onclick="eliminarActividad(${item.id})" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button>
                    </div>`;
            } else {
                botonesAccion = item.completado ? `<span class="badge bg-success">Listo</span>` : `<span class="badge bg-light text-muted border">Pendiente</span>`;
            }

            tabla.innerHTML += `
                <tr class="${estiloFila}">
                    <td>
                        <div class="d-flex flex-column">
                            <span class="badge-date text-center">${fechaFormateada}</span>
                            <small class="${tiempo.color} mt-1 text-center" style="font-size: 0.75rem;">${item.completado ? 'Completado' : tiempo.texto}</small>
                        </div>
                    </td>
                    <td class="fw-bold text-dark align-middle">${item.actividad}</td>
                    <td class="text-muted align-middle">${item.detalles || '-'}</td>
                    <td class="align-middle text-end">${botonesAccion}</td>
                </tr>`;
        });
    } catch (error) { console.error(error); } finally { loading.style.display = 'none'; }
}

// --- 5. OPERACIONES DE ACTIVIDADES (Crear, Editar, Borrar) ---
window.abrirModalEditar = (id) => {
    const item = actividadesActuales.find(a => a.id === id);
    if (!item) return;
    document.getElementById('editId').value = item.id;
    document.getElementById('editActividad').value = item.actividad;
    document.getElementById('editDetalles').value = item.detalles || '';
    const f = new Date(item.fecha);
    const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
    document.getElementById('editFecha').value = fUser.toISOString().split('T')[0];
    new bootstrap.Modal(document.getElementById('modalEditar')).show();
};

const formEditar = document.getElementById('formEditar');
if(formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const datos = {
            fecha: document.getElementById('editFecha').value,
            actividad: document.getElementById('editActividad').value,
            detalles: document.getElementById('editDetalles').value
        };
        await fetch(`/api/actividades/editar/${id}`, {
            method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(datos)
        });
        bootstrap.Modal.getInstance(document.getElementById('modalEditar')).hide();
        Swal.fire('Actualizado', '', 'success');
        cargarActividades();
    });
}

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nueva = {
            fecha: document.getElementById('fecha').value,
            actividad: document.getElementById('actividad').value,
            detalles: document.getElementById('detalles').value
        };
        await fetch('/api/actividades', {
            method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(nueva)
        });
        form.reset(); cargarActividades();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
    });
}

window.cambiarEstado = async (id, nuevoEstado) => {
    await fetch(`/api/actividades/${id}`, {
        method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify({ completado: nuevoEstado })
    });
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
    nuevoEstado ? Toast.fire({ icon: 'success', title: '¡Gloria a Dios!' }) : Toast.fire({ icon: 'info', title: 'Pendiente' });
    cargarActividades();
};

window.eliminarActividad = async (id) => {
    const r = await Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí' });
    if (r.isConfirmed) {
        await fetch(`/api/actividades/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
        cargarActividades();
        Swal.fire('Eliminado', '', 'success');
    }
};

// --- 6. GESTIÓN DE USUARIOS ---
async function cargarUsuarios() {
    const tablaUsuarios = document.getElementById('tablaUsuarios');
    if(!tablaUsuarios) return;
    try {
        const res = await fetch('/api/usuarios', { headers: { 'Authorization': token } });
        const usuarios = await res.json();
        tablaUsuarios.innerHTML = '';
        usuarios.forEach(user => {
            const badge = user.rol === 'admin' ? 'bg-primary' : 'bg-secondary';
            tablaUsuarios.innerHTML += `<tr><td>#${user.id}</td><td class="fw-bold">${user.username}</td><td><span class="badge ${badge}">${user.rol}</span></td><td class="text-end"><button onclick="eliminarUsuario(${user.id})" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button></td></tr>`;
        });
    } catch (e) { console.error(e); }
}

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
    if(confirm("¿Eliminar usuario?")) {
        await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
        cargarUsuarios();
    }
};

// --- 7. GESTIÓN DE MIEMBROS ---
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return "-";
    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) { edad--; }
    return edad;
}

async function cargarMiembros() {
    const tablaMiembros = document.getElementById('tablaMiembros');
    if(!tablaMiembros) return;
    try {
        const res = await fetch('/api/miembros', { headers: { 'Authorization': token } });
        const data = await res.json();
        miembrosActuales = data;
        tablaMiembros.innerHTML = '';
        if(data.length === 0) { tablaMiembros.innerHTML = '<tr><td colspan="6" class="text-muted">Sin miembros</td></tr>'; return; }

        data.forEach(m => {
            const edad = calcularEdad(m.fecha_nacimiento);
            const iBau = m.bautizado ? '<i class="bi bi-check-circle-fill text-success fs-5"></i>' : '<i class="bi bi-circle text-muted opacity-25 fs-5"></i>';
            const iCon = m.confirmado ? '<i class="bi bi-check-circle-fill text-success fs-5"></i>' : '<i class="bi bi-circle text-muted opacity-25 fs-5"></i>';
            tablaMiembros.innerHTML += `
                <tr>
                    <td class="text-start fw-bold">${m.nombre}</td>
                    <td><span class="badge bg-primary bg-opacity-10 text-primary">${edad} años</span></td>
                    <td>${m.congregacion || '-'}</td>
                    <td>${iBau}</td><td>${iCon}</td>
                    <td class="text-end">
                        <button onclick="abrirModalEditarMiembro(${m.id})" class="btn btn-outline-primary btn-sm me-1"><i class="bi bi-pencil-square"></i></button>
                        <button onclick="eliminarMiembro(${m.id})" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

const formMiembro = document.getElementById('miembroForm');
if(formMiembro) {
    formMiembro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevo = {
            nombre: document.getElementById('mNombre').value,
            fecha_nacimiento: document.getElementById('mFecha').value,
            congregacion: document.getElementById('mCongregacion').value,
            bautizado: document.getElementById('mBautizado').checked,
            confirmado: document.getElementById('mConfirmado').checked
        };
        await fetch('/api/miembros', { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(nuevo) });
        Swal.fire('Guardado', '', 'success'); formMiembro.reset(); cargarMiembros();
    });
}

window.abrirModalEditarMiembro = (id) => {
    const m = miembrosActuales.find(x => x.id === id);
    if (!m) return;
    document.getElementById('editMemId').value = m.id;
    document.getElementById('editMemNombre').value = m.nombre;
    document.getElementById('editMemCongregacion').value = m.congregacion || '';
    document.getElementById('editMemBautizado').checked = m.bautizado;
    document.getElementById('editMemConfirmado').checked = m.confirmado;
    if(m.fecha_nacimiento) document.getElementById('editMemFecha').value = new Date(m.fecha_nacimiento).toISOString().split('T')[0];
    new bootstrap.Modal(document.getElementById('modalEditarMiembro')).show();
};

const formEditarMem = document.getElementById('formEditarMiembro');
if(formEditarMem) {
    formEditarMem.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editMemId').value;
        const datos = {
            nombre: document.getElementById('editMemNombre').value,
            fecha_nacimiento: document.getElementById('editMemFecha').value,
            congregacion: document.getElementById('editMemCongregacion').value,
            bautizado: document.getElementById('editMemBautizado').checked,
            confirmado: document.getElementById('editMemConfirmado').checked
        };
        await fetch(`/api/miembros/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalEditarMiembro')).hide();
        Swal.fire('Actualizado', '', 'success'); cargarMiembros();
    });
}

window.eliminarMiembro = async (id) => {
    if ((await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' })).isConfirmed) {
        await fetch(`/api/miembros/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
        cargarMiembros(); Swal.fire('Eliminado', '', 'success');
    }
};

// --- 8. GESTIÓN DE EQUIPO PASTORAL ---
async function cargarEquipo() {
    const contenedor = document.getElementById('contenedorEquipo');
    if(!contenedor) return;
    contenedor.innerHTML = '<div class="spinner-border text-primary"></div>';

    try {
        const res = await fetch('/api/equipo');
        const data = await res.json();
        contenedor.innerHTML = '';

        const niveles = {
            1: { titulo: '', color: 'border-warning border-3', bg: 'bg-warning bg-opacity-10', icon: 'bi-star-fill text-warning' },
            2: { titulo: '', color: 'border-primary border-2', bg: 'bg-white', icon: 'bi-shield-fill text-primary' },
            3: { titulo: 'Directiva', color: 'border-secondary', bg: 'bg-white', icon: 'bi-briefcase-fill text-secondary' },
            4: { titulo: 'Coordinadores', color: 'border-success', bg: 'bg-white', icon: 'bi-people-fill text-success' },
            5: { titulo: 'Vocales y Apoyo', color: 'border-info', bg: 'bg-white', icon: 'bi-mic-fill text-info' }
        };

        for (let i = 1; i <= 5; i++) {
            const grupo = data.filter(d => d.nivel === i);
            if(grupo.length === 0) continue;
            const estilo = niveles[i];
            
            let htmlFila = `<div class="row g-4 justify-content-center w-100 animate__animated animate__fadeInUp">`;
            if(estilo.titulo) htmlFila += `<h6 class="text-muted text-uppercase small fw-bold mt-4 mb-2 border-bottom pb-2 w-75 text-center">${estilo.titulo}</h6>`;

            grupo.forEach(item => {
                const btnEdit = userRol === 'admin' ? `<button onclick="editarCargo(${item.id}, '${item.cargo}', '${item.nombre}')" class="btn btn-sm btn-light border position-absolute top-0 end-0 m-2"><i class="bi bi-pencil-fill small"></i></button>` : '';
                htmlFila += `
                    <div class="col-md-${grupo.length === 1 ? '6' : (grupo.length > 3 ? '3' : '4')}">
                        <div class="card h-100 shadow-sm ${estilo.color} position-relative text-center">
                            ${btnEdit}
                            <div class="card-body">
                                <div class="mb-3"><i class="bi ${estilo.icon} fs-1"></i></div>
                                <h6 class="card-subtitle mb-2 text-muted text-uppercase small fw-bold">${item.cargo}</h6>
                                <h5 class="card-title fw-bold text-dark mb-0">${item.nombre}</h5>
                            </div>
                        </div>
                    </div>`;
            });
            htmlFila += `</div>`;
            contenedor.innerHTML += htmlFila;
        }
    } catch (error) { console.error(error); }
}

window.editarCargo = async (id, cargo, nombreActual) => {
    const { value: nuevoNombre } = await Swal.fire({
        title: `Asignar: ${cargo}`,
        input: 'text',
        inputValue: nombreActual === 'Por asignar' ? '' : nombreActual,
        showCancelButton: true,
        confirmButtonText: 'Guardar',
        cancelButtonText: 'Cancelar'
    });

    if (nuevoNombre) {
        await fetch(`/api/equipo/${id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': token }, body: JSON.stringify({ nombre: nuevoNombre })
        });
        Swal.fire('Asignado', '', 'success');
        cargarEquipo();
    }
};

// Carga Inicial
cargarActividades();