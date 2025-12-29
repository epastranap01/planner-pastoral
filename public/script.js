// --- 1. INICIO Y SEGURIDAD ---
console.log("Cargando sistema..."); // Para verificar que el script arranca

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

// Ocultar formulario a invitados
if (seccionCrear && userRol !== 'admin') {
    seccionCrear.style.display = 'none';
}

// --- 2. SISTEMA DE LOGOUT (NUEVO MÉTODO DIRECTO) ---
// Buscamos el botón por su ID y le pegamos la función
const btnSalir = document.getElementById('btnSalir');

if (btnSalir) {
    btnSalir.addEventListener('click', () => {
        console.log("Click en Salir detectado");
        
        // Intentamos usar la alerta bonita
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
            // Si falla la librería, usamos la ventana básica
            if (confirm("¿Deseas cerrar sesión?")) ejecutarSalida();
        }
    });
} else {
    console.error("Error: No encontré el botón con id='btnSalir' en el HTML");
}

function ejecutarSalida() {
    localStorage.removeItem('token');
    localStorage.removeItem('rol');
    window.location.href = 'login.html';
}

// --- 3. LÓGICA DE ACTIVIDADES ---

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
        const res = await fetch('/api/actividades', {
            headers: { 'Authorization': token }
        });

        if (res.status === 401 || res.status === 403) {
            ejecutarSalida(); // Token vencido
            return;
        }

        const datos = await res.json();
        actividadesActuales = datos;
        
        if(datos.length === 0) {
            tabla.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No hay actividades</td></tr>';
            return;
        }

        datos.forEach(item => {
            const tiempo = calcularTiempoRestante(item.fecha);
            const estiloFila = item.completado ? 'opacity-50 text-decoration-line-through' : '';
            
            // Formatear fecha
            const fechaObj = new Date(item.fecha);
            const fechaUser = new Date(fechaObj.getTime() + fechaObj.getTimezoneOffset() * 60000);
            const fechaFormateada = fechaUser.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });

            let botonesAccion = '';

            if (userRol === 'admin') {
                const iconoCheck = item.completado ? 'bi-check-circle-fill' : 'bi-circle';
                const claseBoton = item.completado ? 'btn-success' : 'btn-outline-secondary';
                
                botonesAccion = `
                    <div class="btn-group" role="group">
                        <button onclick="abrirModalEditar(${item.id})" class="btn btn-outline-primary btn-sm" title="Editar">
                            <i class="bi bi-pencil-square"></i>
                        </button>
                        <button onclick="cambiarEstado(${item.id}, ${!item.completado})" class="btn ${claseBoton} btn-sm" title="Estado">
                            <i class="bi ${iconoCheck}"></i>
                        </button>
                        <button onclick="eliminarActividad(${item.id})" class="btn btn-outline-danger btn-sm" title="Eliminar">
                            <i class="bi bi-trash"></i>
                        </button>
                    </div>
                `;
            } else {
                botonesAccion = item.completado 
                    ? `<span class="badge bg-success"><i class="bi bi-check2"></i> Listo</span>` 
                    : `<span class="badge bg-light text-muted border"><i class="bi bi-clock"></i> Pendiente</span>`;
            }

            tabla.innerHTML += `
                <tr class="${estiloFila}">
                    <td>
                        <div class="d-flex flex-column">
                            <span class="badge-date text-center">${fechaFormateada}</span>
                            <small class="${tiempo.color} mt-1 text-center" style="font-size: 0.75rem;">
                                ${item.completado ? 'Completado' : tiempo.texto}
                            </small>
                        </div>
                    </td>
                    <td class="fw-bold text-dark align-middle">${item.actividad}</td>
                    <td class="text-muted align-middle">${item.detalles || '-'}</td>
                    <td class="align-middle text-end">${botonesAccion}</td>
                </tr>
            `;
        });
    } catch (error) {
        console.error("Error al cargar:", error);
        tabla.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Error de conexión</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// --- 4. ACCIONES (EDITAR, GUARDAR, BORRAR) ---

// Abrir Modal
window.abrirModalEditar = (id) => {
    const item = actividadesActuales.find(a => a.id === id);
    if (!item) return;

    document.getElementById('editId').value = item.id;
    document.getElementById('editActividad').value = item.actividad;
    document.getElementById('editDetalles').value = item.detalles || '';

    const fechaObj = new Date(item.fecha);
    const fechaUser = new Date(fechaObj.getTime() + fechaObj.getTimezoneOffset() * 60000);
    document.getElementById('editFecha').value = fechaUser.toISOString().split('T')[0];

    // Verificar si Bootstrap cargó
    if (typeof bootstrap !== 'undefined') {
        const modal = new bootstrap.Modal(document.getElementById('modalEditar'));
        modal.show();
    } else {
        alert("Error: Bootstrap no cargó correctamente. Revisa tu conexión a internet.");
    }
};

// Guardar Edición
const formEditar = document.getElementById('formEditar');
if(formEditar) {
    formEditar.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const datosEditados = {
            fecha: document.getElementById('editFecha').value,
            actividad: document.getElementById('editActividad').value,
            detalles: document.getElementById('editDetalles').value
        };

        try {
            const res = await fetch(`/api/actividades/editar/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': token },
                body: JSON.stringify(datosEditados)
            });

            if (res.ok) {
                // Cerrar modal
                const modalEl = document.getElementById('modalEditar');
                const modal = bootstrap.Modal.getInstance(modalEl);
                modal.hide();

                Swal.fire('Actualizado', 'Cambios guardados', 'success');
                cargarActividades();
            } else {
                Swal.fire('Error', 'No se pudo editar', 'error');
            }
        } catch (error) {
            console.error(error);
        }
    });
}

// Crear
if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); 
        const nueva = {
            fecha: document.getElementById('fecha').value,
            actividad: document.getElementById('actividad').value,
            detalles: document.getElementById('detalles').value
        };
        await fetch('/api/actividades', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': token }, 
            body: JSON.stringify(nueva) 
        });
        form.reset(); cargarActividades();
        Swal.fire({ icon: 'success', title: 'Guardado', timer: 1500, showConfirmButton: false });
    });
}

// Funciones globales para onclick
// Función para cambiar estado (CON ANIMACIÓN RECUPERADA)
window.cambiarEstado = async (id, nuevoEstado) => {
    console.log("Intentando cambiar estado...", id, new Date().toISOString()); // <--- ESTO NOS AYUDARÁ A VER SI CARGÓ EL NUEVO SCRIPT

    try {
        await fetch(`/api/actividades/${id}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': token 
            },
            body: JSON.stringify({ completado: nuevoEstado })
        });

        // Animación SweetAlert
        const Toast = Swal.mixin({ 
            toast: true, 
            position: 'top-end', 
            showConfirmButton: false, 
            timer: 3000, 
            timerProgressBar: true 
        });

        if (nuevoEstado) {
            Toast.fire({ icon: 'success', title: '¡Gloria a Dios!', text: 'Actividad completada' });
        } else {
            Toast.fire({ icon: 'info', title: 'Pendiente', text: 'Actividad reactivada' });
        }

        cargarActividades();
    } catch (error) { 
        console.error(error);
        Swal.fire('Error', 'Error al actualizar', 'error'); 
    }
};

window.eliminarActividad = async (id) => {
    const r = await Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Sí' });
    if (r.isConfirmed) {
        await fetch(`/api/actividades/${id}`, { method: 'DELETE', headers: { 'Authorization': token } });
        cargarActividades();
        Swal.fire('Eliminado', '', 'success');
    }
};

// --- GESTIÓN DE USUARIOS (Si existe la vista) ---
const navAdmin = document.getElementById('navAdmin');
const vistaPlanner = document.getElementById('vistaPlanner');
const vistaUsuarios = document.getElementById('vistaUsuarios');
const tablaUsuarios = document.getElementById('tablaUsuarios');

if (userRol === 'admin' && navAdmin) {
    navAdmin.style.display = 'flex';
}

window.cambiarVista = (vista) => {
    if(!vistaPlanner) return;
    const btnPlanner = document.getElementById('btnPlanner');
    const btnUsuarios = document.getElementById('btnUsuarios');

    if (vista === 'planner') {
        vistaPlanner.style.display = 'block';
        vistaUsuarios.style.display = 'none';
        btnPlanner.classList.replace('btn-light', 'btn-primary');
        btnUsuarios.classList.replace('btn-primary', 'btn-light');
    } else {
        vistaPlanner.style.display = 'none';
        vistaUsuarios.style.display = 'block';
        btnPlanner.classList.replace('btn-primary', 'btn-light');
        btnUsuarios.classList.replace('btn-light', 'btn-primary');
        cargarUsuarios();
    }
};

async function cargarUsuarios() {
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
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': token },
            body: JSON.stringify({ username, password, rol })
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

// Carga Inicial
cargarActividades();