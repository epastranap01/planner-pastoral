// finance.js - Módulo Financiero
console.log("Cargando Módulo Financiero v1...");

// --- VARIABLES GLOBALES DE FINANZAS ---
let talonarios = [];
let categoriasEgresos = ['Servicios Públicos (Luz/Agua)', 'Mantenimiento', 'Ayuda Social', 'Papelería', 'Honorarios', 'Eventos Especiales'];
let transacciones = [];
let saldoActual = 0;

// --- 1. INICIALIZACIÓN Y NAVEGACIÓN ---
// Se conecta con la función cambiarVista del script principal
const originalCambiarVista = window.cambiarVista;
window.cambiarVista = (vista) => {
    // Ejecutamos la lógica original para ocultar/mostrar divs
    originalCambiarVista(vista);

    const btnFinanzas = document.getElementById('btnFinanzas');
    const divFinanzas = document.getElementById('vistaFinanzas');

    // Resetear botón finanzas
    if(btnFinanzas) btnFinanzas.classList.replace('btn-primary', 'btn-light');
    if(divFinanzas) divFinanzas.style.display = 'none';

    if (vista === 'finanzas') {
        // Solo Admin puede ver esto (Seguridad Frontend)
        if (localStorage.getItem('rol') !== 'admin') {
            Swal.fire('Acceso Denegado', 'Solo administración puede ver finanzas.', 'warning');
            originalCambiarVista('planner');
            return;
        }

        if(divFinanzas) divFinanzas.style.display = 'block';
        if(btnFinanzas) btnFinanzas.classList.replace('btn-light', 'btn-primary');
        cargarDashboardFinanzas();
    }
};

// --- 2. VISTA PRINCIPAL (DASHBOARD) ---
async function cargarDashboardFinanzas() {
    const contenedor = document.getElementById('vistaFinanzas');
    
    // Simulamos carga de datos (Aquí conectarías con tu API real)
    // await fetch('/api/finanzas/transacciones')...
    calcularSaldo();

    contenedor.innerHTML = `
        <div class="row g-4 mb-4">
            <div class="col-md-4">
                <div class="card border-0 shadow-sm bg-primary text-white h-100">
                    <div class="card-body">
                        <h6 class="opacity-75">Saldo Disponible</h6>
                        <h2 class="fw-bold">L. ${saldoActual.toLocaleString('es-HN', {minimumFractionDigits: 2})}</h2>
                        <small><i class="bi bi-wallet2 me-1"></i> Caja General</small>
                    </div>
                </div>
            </div>
            <div class="col-md-8">
                <div class="d-flex gap-2 h-100 align-items-center justify-content-end bg-white p-3 rounded-4 shadow-sm">
                    <button onclick="renderRegistrarIngreso()" class="btn btn-success btn-custom text-white">
                        <i class="bi bi-arrow-down-circle me-2"></i>Registrar Ingreso
                    </button>
                    <button onclick="renderRegistrarEgreso()" class="btn btn-danger btn-custom text-white">
                        <i class="bi bi-arrow-up-circle me-2"></i>Registrar Egreso
                    </button>
                    <button onclick="renderConfigFinanzas()" class="btn btn-secondary btn-custom text-white" title="Configurar Talonarios">
                        <i class="bi bi-gear-fill"></i>
                    </button>
                </div>
            </div>
        </div>

        <div class="card border-0 shadow-sm">
            <div class="card-body p-4">
                <h5 class="fw-bold mb-3">Últimos Movimientos</h5>
                <div class="table-responsive">
                    <table class="table table-hover align-middle">
                        <thead class="table-light">
                            <tr>
                                <th>Fecha</th>
                                <th>Tipo</th>
                                <th>Descripción / Ref</th>
                                <th class="text-end">Monto</th>
                            </tr>
                        </thead>
                        <tbody id="tablaFinanzasBody">
                            ${generarFilasTabla()}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// --- 3. REGISTRAR INGRESO (CON TALONARIOS) ---
async function renderRegistrarIngreso() {
    // Obtenemos lista de miembros para el select
    // Usamos la variable global 'miembrosActuales' del script.js si existe, si no fetch
    let opcionesMiembros = '<option value="">Seleccione (Opcional)</option>';
    if (typeof miembrosActuales !== 'undefined') {
        miembrosActuales.forEach(m => {
            opcionesMiembros += `<option value="${m.nombre}">${m.nombre}</option>`;
        });
    }

    // Lógica de Talonario
    const talonarioActivo = talonarios.find(t => t.activo) || { nombre: 'Sin Talonario', actual: 0 };
    const siguienteRecibo = String(talonarioActivo.actual + 1).padStart(6, '0');

    const html = `
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-success text-white fw-bold">
                <i class="bi bi-arrow-down-circle me-2"></i>Nuevo Ingreso
            </div>
            <div class="card-body p-4">
                <form id="formIngreso">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label text-muted small fw-bold">Tipo de Ingreso</label>
                            <select class="form-select" id="tipoIngreso" onchange="toggleDiezmante(this.value)">
                                <option value="Diezmo">Diezmo</option>
                                <option value="Ofrenda">Ofrenda General</option>
                                <option value="Ofrenda Especial">Ofrenda Especial</option>
                                <option value="Actividad">Actividad / Evento</option>
                                <option value="Donacion">Donación</option>
                                <option value="Saldo Inicial">Apertura de Cuenta</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label text-muted small fw-bold">Talonario / Recibo</label>
                            <div class="input-group">
                                <span class="input-group-text bg-light text-muted small">${talonarioActivo.nombre}</span>
                                <input type="text" class="form-control text-end fw-bold" value="${siguienteRecibo}" readonly>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label text-muted small fw-bold">Monto (L.)</label>
                            <input type="number" step="0.01" class="form-control fw-bold text-success" id="montoIngreso" required placeholder="0.00">
                        </div>

                        <div class="col-md-6" id="divDiezmante">
                            <label class="form-label text-muted small fw-bold">Miembro / Donante</label>
                            <select class="form-select" id="miembroIngreso">
                                ${opcionesMiembros}
                            </select>
                        </div>
                        
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">Detalle / Nota</label>
                            <input type="text" class="form-control" id="detalleIngreso" placeholder="Ej: Ofrenda pro-templo">
                        </div>
                        
                        <div class="col-12 text-end mt-4">
                            <button type="button" onclick="cargarDashboardFinanzas()" class="btn btn-light me-2">Cancelar</button>
                            <button type="submit" class="btn btn-success px-4">Guardar Ingreso</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;

    // Manejador del submit
    document.getElementById('formIngreso').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarTransaccion('ingreso');
    });
}

function toggleDiezmante(tipo) {
    const div = document.getElementById('divDiezmante');
    // Si es ofrenda suelta (anonima), ocultamos el selector, si no, lo mostramos
    if (tipo === 'Ofrenda') div.style.display = 'none';
    else div.style.display = 'block';
}

// --- 4. REGISTRAR EGRESO (GASTOS) ---
function renderRegistrarEgreso() {
    let optsCat = '';
    categoriasEgresos.forEach(c => optsCat += `<option value="${c}">${c}</option>`);

    const html = `
        <div class="card border-0 shadow-sm">
            <div class="card-header bg-danger text-white fw-bold">
                <i class="bi bi-arrow-up-circle me-2"></i>Registrar Gasto (Egreso)
            </div>
            <div class="card-body p-4">
                <form id="formEgreso">
                    <div class="row g-3">
                        <div class="col-md-4">
                            <label class="form-label text-muted small fw-bold">Categoría</label>
                            <select class="form-select" id="catEgreso">
                                ${optsCat}
                                <option value="OTRO">OTRO (Especificar)</option>
                            </select>
                        </div>
                        <div class="col-md-4">
                            <label class="form-label text-muted small fw-bold">Fecha</label>
                            <input type="date" class="form-control" id="fechaEgreso" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label text-muted small fw-bold">Monto (L.)</label>
                            <input type="number" step="0.01" class="form-control fw-bold text-danger" id="montoEgreso" required placeholder="0.00">
                        </div>
                        <div class="col-12">
                            <label class="form-label text-muted small fw-bold">Descripción del Gasto</label>
                            <textarea class="form-control" id="descEgreso" rows="2" placeholder="Detalles de la compra, factura #..."></textarea>
                        </div>
                        <div class="col-12 text-end mt-4">
                            <button type="button" onclick="cargarDashboardFinanzas()" class="btn btn-light me-2">Cancelar</button>
                            <button type="submit" class="btn btn-danger px-4">Registrar Gasto</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;

    document.getElementById('formEgreso').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarTransaccion('egreso');
    });
}

// --- 5. CONFIGURACIÓN (TALONARIOS Y CATEGORÍAS) ---
function renderConfigFinanzas() {
    // Generar lista de talonarios
    let listaTalonarios = talonarios.map((t, index) => `
        <li class="list-group-item d-flex justify-content-between align-items-center">
            <div>
                <strong>${t.nombre}</strong> <small class="text-muted">(${t.inicio} - ${t.fin})</small>
                <br><span class="badge bg-light text-dark border">Actual: ${t.actual}</span>
                ${t.activo ? '<span class="badge bg-success">ACTIVO</span>' : ''}
            </div>
            ${!t.activo ? `<button onclick="activarTalonario(${index})" class="btn btn-sm btn-outline-primary">Activar</button>` : ''}
        </li>
    `).join('');

    const html = `
        <div class="row justify-content-center">
            <div class="col-md-8">
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-header bg-white fw-bold">📚 Gestión de Talonarios</div>
                    <div class="card-body">
                        <ul class="list-group list-group-flush mb-3">${listaTalonarios}</ul>
                        <button onclick="nuevoTalonario()" class="btn btn-outline-primary btn-sm w-100">+ Agregar Nuevo Talonario</button>
                    </div>
                </div>

                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white fw-bold">📋 Categorías de Gastos</div>
                    <div class="card-body">
                        <div class="d-flex gap-2 mb-3">
                            <input type="text" id="newCatEgreso" class="form-control" placeholder="Nueva categoría...">
                            <button onclick="agregarCategoria()" class="btn btn-primary">Agregar</button>
                        </div>
                        <div id="listaCategorias" class="d-flex flex-wrap gap-2">
                            ${categoriasEgresos.map(c => `<span class="badge bg-light text-dark border p-2">${c} <i class="bi bi-x text-danger cursor-pointer" onclick="borrarCategoria('${c}')" style="cursor:pointer"></i></span>`).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="text-center mt-4">
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-link text-muted">« Volver al Panel</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;
}

// --- 6. LÓGICA DE GUARDADO (MOCKUP) ---
function guardarTransaccion(tipo) {
    if (tipo === 'ingreso') {
        const monto = parseFloat(document.getElementById('montoIngreso').value);
        const categoria = document.getElementById('tipoIngreso').value;
        const miembro = document.getElementById('miembroIngreso').value;
        const detalle = document.getElementById('detalleIngreso').value;
        
        // Actualizar Talonario
        const tIndex = talonarios.findIndex(t => t.activo);
        let nRecibo = 'S/N';
        if (tIndex >= 0) {
            talonarios[tIndex].actual++;
            nRecibo = String(talonarios[tIndex].actual).padStart(6, '0');
            // AQUÍ GUARDARÍAS EL TALONARIO ACTUALIZADO EN DB
        }

        transacciones.unshift({
            fecha: new Date(),
            tipo: 'ingreso',
            categoria,
            descripcion: `${miembro ? miembro + ' - ' : ''}${detalle}`,
            monto: monto,
            recibo: nRecibo
        });

        Swal.fire('Ingreso Registrado', `Recibo #${nRecibo} generado`, 'success');

    } else {
        const monto = parseFloat(document.getElementById('montoEgreso').value);
        const cat = document.getElementById('catEgreso').value;
        const desc = document.getElementById('descEgreso').value;
        const fecha = document.getElementById('fechaEgreso').value;

        transacciones.unshift({
            fecha: new Date(fecha),
            tipo: 'egreso',
            categoria: cat,
            descripcion: desc,
            monto: monto,
            recibo: '-'
        });
        Swal.fire('Gasto Registrado', '', 'success');
    }

    // AQUÍ HARÍAS EL FETCH POST A TU API
    cargarDashboardFinanzas();
}

// --- 7. UTILIDADES ---
function calcularSaldo() {
    saldoActual = 0;
    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') saldoActual += t.monto;
        else saldoActual -= t.monto;
    });
}

function generarFilasTabla() {
    if (transacciones.length === 0) return '<tr><td colspan="4" class="text-center text-muted py-3">No hay movimientos registrados</td></tr>';
    
    return transacciones.map(t => {
        const color = t.tipo === 'ingreso' ? 'text-success' : 'text-danger';
        const signo = t.tipo === 'ingreso' ? '+' : '-';
        const fecha = new Date(t.fecha).toLocaleDateString('es-HN');
        
        return `
            <tr>
                <td><small>${fecha}</small></td>
                <td><span class="badge bg-light text-dark border">${t.categoria}</span></td>
                <td>
                    <div class="fw-bold text-dark" style="font-size: 0.9rem;">${t.descripcion}</div>
                    ${t.recibo !== '-' ? `<small class="text-muted" style="font-size: 0.75rem;">Recibo: #${t.recibo}</small>` : ''}
                </td>
                <td class="text-end fw-bold ${color}">${signo} L. ${t.monto.toFixed(2)}</td>
            </tr>
        `;
    }).join('');
}

// Lógica para agregar talonarios (Mock)
async function nuevoTalonario() {
    const { value: formValues } = await Swal.fire({
        title: 'Nuevo Talonario',
        html:
            '<input id="swal-input1" class="swal2-input" placeholder="Nombre (Ej: Serie A)">' +
            '<input id="swal-input2" class="swal2-input" type="number" placeholder="Inicio (Ej: 1)">' +
            '<input id="swal-input3" class="swal2-input" type="number" placeholder="Fin (Ej: 100)">',
        focusConfirm: false,
        preConfirm: () => {
            return [
                document.getElementById('swal-input1').value,
                document.getElementById('swal-input2').value,
                document.getElementById('swal-input3').value
            ]
        }
    });

    if (formValues) {
        talonarios.push({
            nombre: formValues[0],
            inicio: parseInt(formValues[1]),
            fin: parseInt(formValues[2]),
            actual: parseInt(formValues[1]) - 1, // Empieza uno antes para que el primero sea el correcto
            activo: talonarios.length === 0 // Si es el primero, se activa solo
        });
        renderConfigFinanzas();
        Swal.fire('Guardado', '', 'success');
    }
}

function activarTalonario(index) {
    talonarios.forEach(t => t.activo = false);
    talonarios[index].activo = true;
    renderConfigFinanzas();
}

function agregarCategoria() {
    const val = document.getElementById('newCatEgreso').value;
    if(val) {
        categoriasEgresos.push(val);
        renderConfigFinanzas();
    }
}