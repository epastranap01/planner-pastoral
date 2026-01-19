// finance.js - Módulo Financiero (Diseño Unificado)
console.log("Cargando Módulo Financiero v2 (Diseño Corregido)...");

// --- VARIABLES GLOBALES ---
let talonarios = [];
let categoriasEgresos = ['Servicios Públicos', 'Mantenimiento', 'Ayuda Social', 'Papelería', 'Honorarios', 'Eventos'];
let transacciones = [];
let saldoActual = 0;

// --- VISTA PRINCIPAL (DASHBOARD) ---
async function cargarDashboardFinanzas() {
    const contenedor = document.getElementById('vistaFinanzas');
    
    // Aquí cargarías datos reales: await fetch...
    calcularSaldo();

    // 1. ESTRUCTURA BASE (Igual que Planner/Usuarios)
    // Usamos .main-card para mantener la estética blanca y redondeada
    let html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-md-5">
                
                <div class="row align-items-center mb-5">
                    <div class="col-md-6">
                        <h5 class="text-primary fw-bold mb-0"><i class="bi bi-cash-coin me-2"></i>Gestión Financiera</h5>
                        <p class="text-muted small mb-0">Control de Caja y Diezmos</p>
                    </div>
                    <div class="col-md-6 text-md-end mt-3 mt-md-0">
                        <div class="p-3 rounded-4 bg-primary bg-opacity-10 d-inline-block text-start text-md-end border border-primary border-opacity-25">
                            <small class="text-primary fw-bold text-uppercase" style="font-size: 0.75rem;">Saldo Disponible</small>
                            <h2 class="fw-bold text-dark mb-0">L. ${saldoActual.toLocaleString('es-HN', {minimumFractionDigits: 2})}</h2>
                        </div>
                    </div>
                </div>

                <div class="d-grid gap-2 d-md-flex justify-content-center mb-5">
                    <button onclick="renderRegistrarIngreso()" class="btn btn-success btn-custom px-4 shadow-sm">
                        <i class="bi bi-plus-circle-fill me-2"></i>Registrar Ingreso
                    </button>
                    <button onclick="renderRegistrarEgreso()" class="btn btn-danger btn-custom px-4 shadow-sm">
                        <i class="bi bi-dash-circle-fill me-2"></i>Registrar Gasto
                    </button>
                    <button onclick="renderConfigFinanzas()" class="btn btn-light text-muted border px-3" title="Configuración">
                        <i class="bi bi-gear-fill"></i>
                    </button>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="text-dark fw-bold m-0"><i class="bi bi-clock-history me-2"></i>Últimos Movimientos</h5>
                </div>

                <div class="table-responsive">
                    <table class="table table-custom table-hover">
                        <thead>
                            <tr>
                                <th style="width: 20%;">Fecha</th>
                                <th style="width: 15%;">Tipo</th>
                                <th style="width: 45%;">Descripción / Ref</th>
                                <th style="width: 20%; text-align: right;">Monto</th>
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

    contenedor.innerHTML = html;
}

// --- GENERADOR DE FILAS (Adaptado a Móvil) ---
function generarFilasTabla() {
    if (transacciones.length === 0) {
        return '<tr><td colspan="4" class="text-center text-muted py-4">No hay movimientos registrados</td></tr>';
    }
    
    return transacciones.map(t => {
        const esIngreso = t.tipo === 'ingreso';
        const color = esIngreso ? 'text-success' : 'text-danger';
        const signo = esIngreso ? '+' : '-';
        const icono = esIngreso ? 'bi-arrow-down-left' : 'bi-arrow-up-right';
        const bgBadge = esIngreso ? 'bg-success' : 'bg-danger';
        
        // Formato de Fecha
        const f = new Date(t.fecha);
        const fTexto = f.toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });

        // Detalles del Recibo
        let reciboBadge = '';
        if (t.recibo && t.recibo !== '-' && t.recibo !== 'S/N') {
            reciboBadge = `<span class="badge bg-light text-dark border ms-2">#${t.recibo}</span>`;
        }

        return `
            <tr>
                <td data-label="Fecha">
                    <span class="badge-date text-center">${fTexto}</span>
                </td>
                <td data-label="Categoría">
                    <span class="badge ${bgBadge} bg-opacity-10 ${color} border border-opacity-25">
                        <i class="bi ${icono} me-1"></i>${t.categoria}
                    </span>
                </td>
                <td data-label="Descripción">
                    <div class="fw-bold text-dark">${t.descripcion}</div>
                    ${reciboBadge}
                </td>
                <td data-label="Monto" class="text-end">
                    <span class="fw-bold ${color} fs-5">${signo} L. ${t.monto.toFixed(2)}</span>
                </td>
            </tr>
        `;
    }).join('');
}

// --- FORMULARIO INGRESO (Dentro de Main Card) ---
function renderRegistrarIngreso() {
    // Select de Miembros
    let opcionesMiembros = '<option value="">Seleccione (Opcional)</option>';
    if (typeof miembrosActuales !== 'undefined') {
        miembrosActuales.forEach(m => {
            opcionesMiembros += `<option value="${m.nombre}">${m.nombre}</option>`;
        });
    }

    const talonarioActivo = talonarios.find(t => t.activo) || { nombre: 'General', actual: 0 };
    const siguienteRecibo = String(talonarioActivo.actual + 1).padStart(6, '0');

    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="text-success fw-bold m-0"><i class="bi bi-plus-circle-fill me-2"></i>Registrar Ingreso</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-close"></button>
                </div>
                
                <form id="formIngreso">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">Tipo de Ingreso</label>
                            <select class="form-select" id="tipoIngreso" onchange="toggleDiezmante(this.value)">
                                <option value="Diezmo">Diezmo</option>
                                <option value="Ofrenda">Ofrenda General</option>
                                <option value="Ofrenda Especial">Ofrenda Especial</option>
                                <option value="Actividad">Actividad / Evento</option>
                                <option value="Donacion">Donación</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">Recibo (${talonarioActivo.nombre})</label>
                            <input type="text" class="form-control text-end fw-bold bg-light" value="${siguienteRecibo}" readonly>
                        </div>

                        <div class="col-md-6" id="divDiezmante">
                            <label class="form-label text-muted small fw-bold">Miembro / Donante</label>
                            <select class="form-select" id="miembroIngreso">
                                ${opcionesMiembros}
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">Monto (L.)</label>
                            <input type="number" step="0.01" class="form-control fw-bold text-success" id="montoIngreso" required placeholder="0.00" style="font-size: 1.2rem;">
                        </div>

                        <div class="col-12">
                            <label class="form-label text-muted small fw-bold">Nota / Detalle</label>
                            <input type="text" class="form-control" id="detalleIngreso" placeholder="Ej: Ofrenda pro-construcción">
                        </div>

                        <div class="col-12 text-end mt-4">
                            <button type="submit" class="btn btn-success btn-custom px-5 text-white">Guardar Ingreso</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;

    document.getElementById('formIngreso').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarTransaccion('ingreso');
    });
}

function toggleDiezmante(tipo) {
    const div = document.getElementById('divDiezmante');
    if (tipo === 'Ofrenda') div.style.display = 'none';
    else div.style.display = 'block';
}

// --- FORMULARIO GASTO (Dentro de Main Card) ---
function renderRegistrarEgreso() {
    let optsCat = '';
    categoriasEgresos.forEach(c => optsCat += `<option value="${c}">${c}</option>`);

    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="text-danger fw-bold m-0"><i class="bi bi-dash-circle-fill me-2"></i>Registrar Gasto</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-close"></button>
                </div>

                <form id="formEgreso">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">Categoría</label>
                            <select class="form-select" id="catEgreso">
                                ${optsCat}
                                <option value="OTRO">OTRO (Especificar)</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-muted small fw-bold">Monto (L.)</label>
                            <input type="number" step="0.01" class="form-control fw-bold text-danger" id="montoEgreso" required placeholder="0.00" style="font-size: 1.2rem;">
                        </div>
                        <div class="col-12">
                            <label class="form-label text-muted small fw-bold">Descripción</label>
                            <textarea class="form-control" id="descEgreso" rows="2" placeholder="Detalle del gasto..."></textarea>
                        </div>
                        <div class="col-12 text-end mt-4">
                            <button type="submit" class="btn btn-danger btn-custom px-5 text-white">Registrar Salida</button>
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

// --- CONFIGURACIÓN ---
function renderConfigFinanzas() {
    let listaTalonarios = talonarios.map((t, index) => `
        <li class="list-group-item d-flex justify-content-between align-items-center p-3">
            <div>
                <strong>${t.nombre}</strong> <span class="text-muted small">(${t.inicio} - ${t.fin})</span>
                <div class="small mt-1 text-primary">Actual: #${String(t.actual).padStart(6,'0')}</div>
            </div>
            ${t.activo ? '<span class="badge bg-success">ACTIVO</span>' : `<button onclick="activarTalonario(${index})" class="btn btn-sm btn-outline-secondary">Activar</button>`}
        </li>
    `).join('');

    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="text-dark fw-bold m-0"><i class="bi bi-gear-fill me-2"></i>Configuración Financiera</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-close"></button>
                </div>

                <div class="row g-4">
                    <div class="col-md-6">
                        <div class="card bg-light border-0 h-100">
                            <div class="card-body">
                                <h6 class="fw-bold text-dark mb-3">📚 Talonarios de Recibos</h6>
                                <ul class="list-group shadow-sm mb-3 bg-white rounded">${listaTalonarios}</ul>
                                <button onclick="nuevoTalonario()" class="btn btn-outline-primary w-100 dashed-border">
                                    <i class="bi bi-plus-lg me-1"></i>Nuevo Talonario
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-6">
                        <div class="card bg-light border-0 h-100">
                            <div class="card-body">
                                <h6 class="fw-bold text-dark mb-3">📋 Categorías de Gastos</h6>
                                <div class="d-flex gap-2 mb-3">
                                    <input type="text" id="newCatEgreso" class="form-control" placeholder="Nueva categoría...">
                                    <button onclick="agregarCategoria()" class="btn btn-dark"><i class="bi bi-plus-lg"></i></button>
                                </div>
                                <div class="d-flex flex-wrap gap-2">
                                    ${categoriasEgresos.map(c => `<span class="badge bg-white text-dark border p-2 shadow-sm">${c} <i class="bi bi-x text-danger ms-1 cursor-pointer" onclick="borrarCategoria('${c}')" style="cursor:pointer"></i></span>`).join('')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;
}

// --- LÓGICA DE DATOS (MOCKUP TEMPORAL) ---
function guardarTransaccion(tipo) {
    const fecha = new Date().toISOString();
    
    if (tipo === 'ingreso') {
        const monto = parseFloat(document.getElementById('montoIngreso').value);
        const categoria = document.getElementById('tipoIngreso').value;
        const miembro = document.getElementById('miembroIngreso').value;
        const detalle = document.getElementById('detalleIngreso').value;
        
        // Talonario
        const tIndex = talonarios.findIndex(t => t.activo);
        let nRecibo = 'S/N';
        if (tIndex >= 0) {
            talonarios[tIndex].actual++;
            nRecibo = String(talonarios[tIndex].actual).padStart(6, '0');
        }

        transacciones.unshift({
            fecha: fecha,
            tipo: 'ingreso',
            categoria,
            descripcion: `${miembro ? miembro + ' - ' : ''}${detalle}`,
            monto: monto,
            recibo: nRecibo
        });
        Swal.fire('Ingreso Guardado', `Recibo #${nRecibo}`, 'success');

    } else {
        const monto = parseFloat(document.getElementById('montoEgreso').value);
        const cat = document.getElementById('catEgreso').value;
        const desc = document.getElementById('descEgreso').value;

        transacciones.unshift({
            fecha: fecha,
            tipo: 'egreso',
            categoria: cat,
            descripcion: desc,
            monto: monto,
            recibo: '-'
        });
        Swal.fire('Gasto Registrado', '', 'success');
    }
    cargarDashboardFinanzas();
}

function calcularSaldo() {
    saldoActual = 0;
    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') saldoActual += t.monto;
        else saldoActual -= t.monto;
    });
}

// Helpers Configuración
async function nuevoTalonario() {
    const { value: f } = await Swal.fire({
        title: 'Nuevo Talonario',
        html: '<input id="sw1" class="swal2-input" placeholder="Nombre (Ej: Serie A)">' +
              '<input id="sw2" class="swal2-input" type="number" placeholder="Inicio">' +
              '<input id="sw3" class="swal2-input" type="number" placeholder="Fin">',
        focusConfirm: false,
        preConfirm: () => [
            document.getElementById('sw1').value,
            document.getElementById('sw2').value,
            document.getElementById('sw3').value
        ]
    });

    if (f && f[0] && f[1] && f[2]) {
        talonarios.push({
            nombre: f[0],
            inicio: parseInt(f[1]),
            fin: parseInt(f[2]),
            actual: parseInt(f[1]) - 1,
            activo: talonarios.length === 0
        });
        renderConfigFinanzas();
    }
}

function activarTalonario(idx) {
    talonarios.forEach(t => t.activo = false);
    talonarios[idx].activo = true;
    renderConfigFinanzas();
}

function agregarCategoria() {
    const v = document.getElementById('newCatEgreso').value;
    if(v) { categoriasEgresos.push(v); renderConfigFinanzas(); }
}