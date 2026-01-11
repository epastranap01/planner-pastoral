// --- 1. INICIO Y SEGURIDAD ---
console.log("Cargando sistema v9 (Usuarios corregido)..."); 

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
    window.location.href = 'login.html';
}

// --- 3. NAVEGACIÓN ---
const navAdmin = document.getElementById('navAdmin');
if (navAdmin) navAdmin.style.display = 'flex';

const btnUsuarios = document.getElementById('btnUsuarios');
if (userRol !== 'admin' && btnUsuarios) btnUsuarios.style.display = 'none';

window.cambiarVista = (vista) => {
    const btnPlanner = document.getElementById('btnPlanner');
    const btnMiembros = document.getElementById('btnMiembros');
    const btnEquipo = document.getElementById('btnEquipo');

    const divPlanner = document.getElementById('vistaPlanner');
    const divUsuarios = document.getElementById('vistaUsuarios');
    const divMiembros = document.getElementById('vistaMiembros');
    const divEquipo = document.getElementById('vistaEquipo');

    // Reset
    if(divPlanner) divPlanner.style.display = 'none';
    if(divUsuarios) divUsuarios.style.display = 'none';
    if(divMiembros) divMiembros.style.display = 'none';
    if(divEquipo) divEquipo.style.display = 'none';

    if(btnPlanner) btnPlanner.classList.replace('btn-primary', 'btn-light');
    if(btnUsuarios) btnUsuarios.classList.replace('btn-primary', 'btn-light');
    if(btnMiembros) btnMiembros.classList.replace('btn-primary', 'btn-light');
    if(btnEquipo) btnEquipo.classList.replace('btn-primary', 'btn-light');

    // Activar
    if (vista === 'planner') {
        if(divPlanner) divPlanner.style.display = 'block';
        if(btnPlanner) btnPlanner.classList.replace('btn-light', 'btn-primary');
    } 
    else if (vista === 'usuarios') {
        if (userRol !== 'admin') return; // Seguridad
        if(divUsuarios) divUsuarios.style.display = 'block';
        if(btnUsuarios) btnUsuarios.classList.replace('btn-light', 'btn-primary');
        cargarUsuarios(); // AQUÍ FALLABA ANTES PORQUE NO EXISTÍA LA FUNCIÓN
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

// --- 4. GESTIÓN DE USUARIOS (¡ESTA ES LA QUE FALTABA!) ---
async function cargarUsuarios() {
    if(userRol !== 'admin') return;

    const tablaUsuarios = document.getElementById('tablaUsuarios');
    if(!tablaUsuarios) return;

    try {
        const res = await fetch('/api/usuarios', { headers: { 'Authorization': token } });
        const usuarios = await res.json();
        tablaUsuarios.innerHTML = '';

        usuarios.forEach(user => {
            const badge = user.rol === 'admin' ? 'bg-primary' : 'bg-secondary';
            tablaUsuarios.innerHTML += `
                <tr>
                    <td data-label="ID">#${user.id}</td>
                    <td data-label="Usuario" class="fw-bold">${user.username}</td>
                    <td data-label="Rol"><span class="badge ${badge}">${user.rol}</span></td>
                    <td class="text-end">
                        <button onclick="resetPassword(${user.id}, '${user.username}')" class="btn btn-outline-warning btn-sm me-1" title="Cambiar Contraseña">
                            <i class="bi bi-key-fill"></i>
                        </button>
                        <button onclick="eliminarUsuario(${user.id})" class="btn btn-outline-danger btn-sm" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>`;
        });
    } catch (e) { console.error(e); }
}

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
    if(confirm("¿Eliminar usuario?")) {
        await fetch(`/api/usuarios/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
        cargarUsuarios();
    }
};

// --- 5. LÓGICA DE ACTIVIDADES ---
function calcularTiempoRestante(fechaFutura) {
    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const futuro = new Date(fechaFutura);
    const futuroAjustado = new Date(futuro.getTime() + futuro.getTimezoneOffset() * 60000);
    const dias = Math.ceil((futuroAjustado - hoy) / (1000 * 60 * 60 * 24));
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
        if(datos.length === 0) { tabla.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No hay actividades</td></tr>'; return; }
        datos.forEach(item => {
            const tiempo = calcularTiempoRestante(item.fecha);
            const estiloFila = item.completado ? 'opacity-50 text-decoration-line-through' : '';
            const f = new Date(item.fecha); const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
            let botonesAccion = '';
            if (userRol === 'admin') {
                const iconoCheck = item.completado ? 'bi-check-circle-fill' : 'bi-circle';
                const claseBoton = item.completado ? 'btn-success' : 'btn-outline-secondary';
                botonesAccion = `<div class="btn-group" role="group"><button onclick="abrirModalEditar(${item.id})" class="btn btn-outline-primary btn-sm"><i class="bi bi-pencil-square"></i></button><button onclick="cambiarEstado(${item.id}, ${!item.completado})" class="btn ${claseBoton} btn-sm"><i class="bi ${iconoCheck}"></i></button><button onclick="eliminarActividad(${item.id})" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button></div>`;
            } else { botonesAccion = item.completado ? `<span class="badge bg-success">Listo</span>` : `<span class="badge bg-light text-muted border">Pendiente</span>`; }
            tabla.innerHTML += `<tr class="${estiloFila}"><td data-label="Fecha"><div class="d-flex flex-column"><span class="badge-date text-center">${fUser.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span><small class="${tiempo.color} mt-1 text-center" style="font-size: 0.75rem;">${item.completado ? 'Completado' : tiempo.texto}</small></div></td><td data-label="Actividad" class="fw-bold text-dark align-middle">${item.actividad}</td><td data-label="Detalles" class="text-muted align-middle">${item.detalles || '-'}</td><td class="align-middle text-end">${botonesAccion}</td></tr>`;
        });
    } catch (error) { console.error(error); } finally { loading.style.display = 'none'; }
}

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
        await fetch('/api/actividades', { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(nueva) });
        form.reset(); cargarActividades(); Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
    });
}
window.cambiarEstado = async (id, nuevoEstado) => {
    await fetch(`/api/actividades/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify({ completado: nuevoEstado }) });
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 3000, timerProgressBar: true });
    nuevoEstado ? Toast.fire({ icon: 'success', title: '¡Gloria a Dios!' }) : Toast.fire({ icon: 'info', title: 'Pendiente' }); cargarActividades();
};
window.eliminarActividad = async (id) => {
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
async function cargarMiembros() {
    const formMiembro = document.getElementById('miembroForm');
    const tituloForm = document.querySelector('#vistaMiembros h5');
    if (userRol !== 'admin') { if(formMiembro) formMiembro.style.display = 'none'; if(tituloForm) tituloForm.style.display = 'none'; } 
    else { if(formMiembro) formMiembro.style.display = 'block'; if(tituloForm) tituloForm.style.display = 'block'; }

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
            let botones = '';
            if (userRol === 'admin') { botones = `<button onclick="abrirModalEditarMiembro(${m.id})" class="btn btn-outline-primary btn-sm me-1"><i class="bi bi-pencil-square"></i></button><button onclick="eliminarMiembro(${m.id})" class="btn btn-outline-danger btn-sm"><i class="bi bi-trash"></i></button>`; }
            tablaMiembros.innerHTML += `<tr><td data-label="Nombre" class="text-start fw-bold">${m.nombre}</td><td data-label="Edad"><span class="badge bg-primary bg-opacity-10 text-primary">${edad} años</span></td><td data-label="Congregación">${m.congregacion || '-'}</td><td data-label="Bautizado">${iBau}</td><td data-label="Confirmado">${iCon}</td><td class="text-end">${botones}</td></tr>`;
        });
    } catch (e) { console.error(e); }
}
const formMiembro = document.getElementById('miembroForm');
if(formMiembro) {
    formMiembro.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nuevo = { nombre: document.getElementById('mNombre').value, fecha_nacimiento: document.getElementById('mFecha').value, congregacion: document.getElementById('mCongregacion').value, bautizado: document.getElementById('mBautizado').checked, confirmado: document.getElementById('mConfirmado').checked };
        await fetch('/api/miembros', { method: 'POST', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(nuevo) });
        Swal.fire('Guardado', '', 'success'); formMiembro.reset(); cargarMiembros();
    });
}
window.abrirModalEditarMiembro = (id) => {
    if(userRol !== 'admin') return;
    const m = miembrosActuales.find(x => x.id === id); if (!m) return;
    document.getElementById('editMemId').value = m.id; document.getElementById('editMemNombre').value = m.nombre;
    document.getElementById('editMemCongregacion').value = m.congregacion || ''; document.getElementById('editMemBautizado').checked = m.bautizado;
    document.getElementById('editMemConfirmado').checked = m.confirmado;
    if(m.fecha_nacimiento) document.getElementById('editMemFecha').value = new Date(m.fecha_nacimiento).toISOString().split('T')[0];
    new bootstrap.Modal(document.getElementById('modalEditarMiembro')).show();
};
const formEditarMem = document.getElementById('formEditarMiembro');
if(formEditarMem) {
    formEditarMem.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editMemId').value;
        const datos = { nombre: document.getElementById('editMemNombre').value, fecha_nacimiento: document.getElementById('editMemFecha').value, congregacion: document.getElementById('editMemCongregacion').value, bautizado: document.getElementById('editMemBautizado').checked, confirmado: document.getElementById('editMemConfirmado').checked };
        await fetch(`/api/miembros/${id}`, { method: 'PUT', headers: {'Content-Type': 'application/json', 'Authorization': token}, body: JSON.stringify(datos) });
        bootstrap.Modal.getInstance(document.getElementById('modalEditarMiembro')).hide(); Swal.fire('Actualizado', '', 'success'); cargarMiembros();
    });
}
window.eliminarMiembro = async (id) => {
    if(userRol !== 'admin') return;
    if ((await Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' })).isConfirmed) {
        await fetch(`/api/miembros/${id}`, { method: 'DELETE', headers: { 'Authorization': token } }); cargarMiembros(); Swal.fire('Eliminado', '', 'success');
    }
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

// --- 8. CUMPLEAÑEROS DEL MES (NUEVO) ---
async function cargarCumpleaneros() {
    const contenedor = document.getElementById('listaCumpleaneros');
    const seccion = document.getElementById('seccionCumpleaneros');
    if (!contenedor || !seccion) return;

    try {
        // 1. Obtenemos miembros (reusamos la API)
        const res = await fetch('/api/miembros', { headers: { 'Authorization': token } });
        const miembros = await res.json();
        
        const hoy = new Date();
        const mesActual = hoy.getMonth(); // 0 = Enero, 11 = Diciembre
        
        // Nombres de meses para el título
        const nombresMeses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        
        // Actualizamos título del bloque
        seccion.querySelector('h5').innerHTML = `<i class="bi bi-cake2-fill me-2"></i>Cumpleañeros de ${nombresMeses[mesActual]}`;

        // 2. Filtramos los que cumplen este mes
        const cumplenEsteMes = miembros.filter(m => {
            if (!m.fecha_nacimiento) return false;
            // Truco para evitar problemas de zona horaria: leemos el string directo "YYYY-MM-DD"
            const partes = new Date(m.fecha_nacimiento).toISOString().split('T')[0].split('-'); 
            const mesNac = parseInt(partes[1]) - 1; // Mes del string (1-12) a (0-11)
            return mesNac === mesActual;
        });

        // 3. Si no hay nadie, ocultamos la sección
        if (cumplenEsteMes.length === 0) {
            seccion.style.display = 'none';
            return;
        }

        // 4. Si hay, mostramos y ordenamos por día
        seccion.style.display = 'block';
        
        // Ordenar por día del mes
        cumplenEsteMes.sort((a, b) => {
            const diaA = parseInt(new Date(a.fecha_nacimiento).toISOString().split('T')[0].split('-')[2]);
            const diaB = parseInt(new Date(b.fecha_nacimiento).toISOString().split('T')[0].split('-')[2]);
            return diaA - diaB;
        });

        // 5. Generar HTML "Macizo"
        contenedor.innerHTML = '';
        cumplenEsteMes.forEach(m => {
            const fecha = new Date(m.fecha_nacimiento).toISOString().split('T')[0].split('-');
            const dia = fecha[2];
            
            // Calcular edad que VA a cumplir
            const anioNac = parseInt(fecha[0]);
            const edad = hoy.getFullYear() - anioNac;

            contenedor.innerHTML += `
                <div class="col-6 col-md-3 col-lg-2">
                    <div class="bg-white text-dark rounded-3 p-2 text-center h-100 shadow-sm position-relative">
                        <span class="badge bg-warning text-dark position-absolute top-0 start-50 translate-middle shadow-sm rounded-pill border border-white">
                            ${dia} ${nombresMeses[mesActual].substring(0,3)}
                        </span>
                        <div class="mt-3 mb-1">
                            <i class="bi bi-person-circle fs-1 text-secondary"></i>
                        </div>
                        <h6 class="fw-bold small mb-1 text-truncate">${m.nombre.split(' ')[0]} ${m.nombre.split(' ')[1] || ''}</h6>
                        <small class="text-muted fw-bold" style="font-size: 0.75rem;">Cumple ${edad}</small>
                    </div>
                </div>
            `;
        });

    } catch (error) {
        console.error("Error cargando cumpleaños:", error);
    }
}

// --- 9. GENERAR PDF (CORREGIDO: DIBUJO DE ESTADOS) ---
window.generarPDF = () => {
    if (!window.jspdf) {
        Swal.fire('Error', 'Librerías PDF no cargadas.', 'error');
        return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // --- COLORES ---
    const azulBrand = [13, 110, 253];
    const azulOscuro = [10, 88, 202];
    const grisTexto = [80, 80, 80];
    const grisLight = [245, 247, 250];
    const verdeExito = [25, 135, 84];
    const naranjaPend = [253, 126, 20];

    // Márgenes
    const margin = 15;
    const pageWidth = doc.internal.pageSize.width;
    const contentWidth = pageWidth - (margin * 2);

    // --- 1. ENCABEZADO ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...azulBrand);
    doc.text("EL BUEN PASTOR", margin, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...grisTexto);
    doc.text("IGLESIA CRISTIANA LUTERANA", margin, 26);

    const fechaImpresion = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
    const usuario = localStorage.getItem('username') || 'Admin';

    doc.setFontSize(9);
    doc.text("REPORTE DE ACTIVIDADES", pageWidth - margin, 20, { align: "right" });
    doc.text(`Fecha: ${fechaImpresion}`, pageWidth - margin, 25, { align: "right" });
    doc.text(`Generado por: ${usuario}`, pageWidth - margin, 30, { align: "right" });

    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(margin, 35, pageWidth - margin, 35);

    // --- 2. RESUMEN (KPIs) ---
    const total = actividadesActuales.length;
    const completadas = actividadesActuales.filter(a => a.completado).length;
    const pendientes = total - completadas;

    const startY = 45;
    const cardWidth = contentWidth / 3 - 4;

    const drawKpi = (x, label, value, color) => {
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(label.toUpperCase(), x, startY);
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...color);
        doc.text(String(value), x, startY + 9);
        doc.setDrawColor(...color);
        doc.setLineWidth(1);
        doc.line(x, startY + 12, x + 15, startY + 12);
    };

    drawKpi(margin, "Total Planificado", total, azulBrand);
    drawKpi(margin + cardWidth + 5, "Actividades Listas", completadas, verdeExito);
    drawKpi(margin + (cardWidth * 2) + 10, "Pendientes", pendientes, naranjaPend);

    // --- 3. TABLA ---
    const datosOrdenados = actividadesActuales.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    const cuerpoTabla = datosOrdenados.map(item => {
        const f = new Date(item.fecha);
        const fUser = new Date(f.getTime() + f.getTimezoneOffset() * 60000);
        const fechaTexto = fUser.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        
        // Pasamos un string vacío en la última columna, porque vamos a DIBUJAR ahí
        return [
            fechaTexto,
            item.actividad,
            item.detalles || '',
            item.completado ? 'SI' : 'NO' // Dato oculto para saber qué dibujar
        ];
    });

    doc.autoTable({
        startY: 70,
        head: [['FECHA', 'ACTIVIDAD', 'DETALLES', 'ESTADO']],
        body: cuerpoTabla,
        theme: 'plain',
        headStyles: { fillColor: azulOscuro, textColor: 255, fontStyle: 'bold', halign: 'left', cellPadding: 5 },
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 5, valign: 'middle', textColor: grisTexto, lineColor: [230, 230, 230], lineWidth: { bottom: 0.1 } },
        columnStyles: {
            0: { cellWidth: 30, fontStyle: 'bold' },
            1: { cellWidth: 60, fontStyle: 'bold', textColor: [0,0,0] },
            2: { cellWidth: 'auto' },
            3: { cellWidth: 25, halign: 'center' }
        },
        
        // --- AQUÍ ESTÁ EL ARREGLO: DIBUJAMOS CÍRCULOS ---
        didParseCell: function(data) {
            if (data.section === 'body' && data.row.index % 2 === 0) {
                data.cell.styles.fillColor = grisLight;
            }
        },
        
        didDrawCell: function(data) {
            // Solo actuamos en la columna ESTADO (índice 3) y en el cuerpo
            if (data.section === 'body' && data.column.index === 3) {
                const esCompletado = data.cell.raw === 'SI';
                
                // Coordenadas del centro de la celda
                const x = data.cell.x + (data.cell.width / 2);
                const y = data.cell.y + (data.cell.height / 2);
                
                if (esCompletado) {
                    // DIBUJAR CÍRCULO VERDE LLENO
                    doc.setFillColor(...verdeExito);
                    doc.circle(x, y, 3, 'F'); // Radio 3
                } else {
                    // DIBUJAR ANILLO NARANJA (PENDIENTE)
                    doc.setDrawColor(...naranjaPend);
                    doc.setLineWidth(0.5);
                    doc.circle(x, y, 3, 'S'); // 'S' = Stroke (Solo borde)
                    
                    // Opcional: Un puntito pequeño en el centro
                    doc.setFillColor(...naranjaPend);
                    doc.circle(x, y, 1, 'F');
                }
            }
        },
        
        // Borramos el texto "SI" o "NO" para que no se vea feo detrás del dibujo
        willDrawCell: function(data) {
            if (data.section === 'body' && data.column.index === 3) {
                data.cell.text = ''; 
            }
        }
    });

    // --- 4. PIE DE PÁGINA ---
    const paginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= paginas; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.text("Sistema de planificacion de actividades - Uso interno", margin, 285);
        doc.text(`Página ${i} de ${paginas}`, pageWidth - margin, 285, { align: "right" });
    }

    doc.save(`Planner_BuenPastor_${new Date().toISOString().split('T')[0]}.pdf`);
};
// === IMPORTANTE: AGREGAR ESTO AL FINAL DE TU SCRIPT ===
// Busca donde dice: // Carga Inicial
// Y agrega la llamada a cargarCumpleaneros();
// Carga Inicial
cargarActividades();
cargarCumpleaneros();