// finance.js - Módulo Financiero v5 (Profesional, Responsivo y Completo)
console.log("Cargando Módulo Financiero v5...");

// --- VARIABLES GLOBALES (Simulación de BD) ---
let talonarios = [
    { nombre: 'Serie A - 2025', inicio: 1, fin: 100, actual: 0, activo: true, usados: [] }
];
let categoriasEgresos = ['Servicios Públicos', 'Mantenimiento', 'Ayuda Social', 'Papelería', 'Honorarios', 'Eventos', 'Limpieza'];
let tiposCultos = ['Culto Dominical', 'Escuela Dominical', 'Culto de Oración', 'Culto de Enseñanza', 'Reunión de Jóvenes', 'Reunión de Damas', 'Vigilia'];

let transacciones = [];
let saldoActual = 0;

// --- FORMATEADORES (Helpers para que todo se vea bonito) ---
const formatoMoneda = (monto) => {
    return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(monto);
};

const formatoFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    // Truco para evitar problemas de zona horaria al crear la fecha
    const fecha = new Date(fechaStr);
    const userTimezoneOffset = fecha.getTimezoneOffset() * 60000;
    const fechaCorregida = new Date(fecha.getTime() + userTimezoneOffset);
    
    // Formato: 19-ENE-2025
    return fechaCorregida.toLocaleDateString('es-ES', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric' 
    }).replace('.', '').toUpperCase().replace(/ /g, '-');
};

// --- VISTA PRINCIPAL (DASHBOARD) ---
async function cargarDashboardFinanzas() {
    const contenedor = document.getElementById('vistaFinanzas');
    calcularSaldo();

    let html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-lg-5">
                
                <div class="row align-items-center mb-5 gy-3">
                    <div class="col-md-7">
                        <h4 class="text-primary fw-bold mb-1"><i class="bi bi-wallet2 me-2"></i>Finanzas & Tesorería</h4>
                        <p class="text-muted small mb-0">Control de ingresos, egresos y flujo de caja.</p>
                    </div>
                    <div class="col-md-5">
                        <div class="card bg-primary text-white border-0 shadow-sm">
                            <div class="card-body py-3 px-4 d-flex justify-content-between align-items-center">
                                <div>
                                    <small class="text-white-50 text-uppercase fw-bold" style="font-size: 0.7rem;">Saldo Disponible</small>
                                    <h2 class="fw-bold mb-0">${formatoMoneda(saldoActual)}</h2>
                                </div>
                                <i class="bi bi-safe2-fill fs-1 text-white-50"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-grid gap-3 d-md-flex justify-content-md-center mb-5">
                    <button onclick="renderAperturaCuenta()" class="btn btn-outline-warning text-dark fw-bold px-4 py-2 shadow-sm rounded-3">
                        <i class="bi bi-sliders me-2"></i>Ajuste / Apertura
                    </button>
                    <button onclick="renderRegistrarIngreso()" class="btn btn-success fw-bold px-4 py-2 shadow-sm rounded-3">
                        <i class="bi bi-arrow-down-circle-fill me-2"></i>Nuevo Ingreso
                    </button>
                    <button onclick="renderRegistrarEgreso()" class="btn btn-danger fw-bold px-4 py-2 shadow-sm rounded-3">
                        <i class="bi bi-arrow-up-circle-fill me-2"></i>Nuevo Gasto
                    </button>
                    <button onclick="renderConfigFinanzas()" class="btn btn-light text-secondary border px-3 py-2 shadow-sm rounded-3" title="Configuración">
                        <i class="bi bi-gear-wide-connected fs-5"></i>
                    </button>
                </div>

                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h6 class="text-dark fw-bold m-0 text-uppercase spacing-1"><i class="bi bi-list-columns-reverse me-2"></i>Historial de Transacciones</h6>
                </div>

                <div class="table-responsive">
                    <table class="table table-custom table-hover align-middle">
                        <thead>
                            <tr>
                                <th style="width: 15%;">Fecha</th>
                                <th style="width: 10%;">Recibo</th>
                                <th style="width: 20%;">Categoría</th>
                                <th style="width: 35%;">Descripción</th>
                                <th style="width: 20%; text-align: right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody class="fs-6">${generarFilasTabla()}</tbody>
                    </table>
                </div>

            </div>
        </div>
    `;
    contenedor.innerHTML = html;
}

// --- 1. APERTURA / AJUSTE DE CAJA ---
function renderAperturaCuenta() {
    const saldoExistente = transacciones.find(t => t.categoria === 'SALDO INICIAL');
    const valorActual = saldoExistente ? saldoExistente.monto : '';
    const fechaActual = saldoExistente ? new Date(saldoExistente.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const titulo = saldoExistente ? 'Ajustar Saldo Inicial' : 'Apertura de Caja';

    const html = `
        <div class="card main-card mb-5 border-warning border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4">
                    <h5 class="text-dark fw-bold"><i class="bi bi-sliders me-2 text-warning"></i>${titulo}</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn-close"></button>
                </div>
                
                <div class="alert alert-light border-0 shadow-sm d-flex align-items-center mb-4">
                    <i class="bi bi-info-circle-fill text-warning fs-4 me-3"></i>
                    <small class="text-muted">Use esta opción para establecer el dinero físico con el que inicia el sistema. Si edita esto, afectará el saldo total actual.</small>
                </div>

                <form id="formApertura">
                    <div class="row g-4">
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-muted small text-uppercase">Monto Inicial (L.)</label>
                            <input type="number" step="0.01" id="montoApertura" class="form-control form-control-lg fw-bold" value="${valorActual}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold text-muted small text-uppercase">Fecha de Corte</label>
                            <input type="date" id="fechaApertura" class="form-control form-control-lg" value="${fechaActual}">
                        </div>
                        <div class="col-12 text-end mt-4">
                            <button type="submit" class="btn btn-warning fw-bold px-5 text-dark">Guardar Ajuste</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;

    document.getElementById('formApertura').addEventListener('submit', (e) => {
        e.preventDefault();
        const monto = parseFloat(document.getElementById('montoApertura').value);
        const fecha = document.getElementById('fechaApertura').value;

        if (saldoExistente) {
            saldoExistente.monto = monto;
            saldoExistente.fecha = fecha;
            Swal.fire('Actualizado', 'Saldo inicial corregido.', 'success');
        } else {
            transacciones.push({
                fecha: fecha,
                tipo: 'ingreso',
                categoria: 'SALDO INICIAL',
                descripcion: 'Saldo arrastrado (Inicio de Sistema)',
                monto: monto,
                recibo: 'APERTURA'
            });
            Swal.fire('Caja Abierta', 'Sistema iniciado correctamente.', 'success');
        }
        cargarDashboardFinanzas();
    });
}

// --- 2. NUEVO INGRESO (Full Completo) ---
function renderRegistrarIngreso() {
    const tal = talonarios.find(t => t.activo);
    const siguienteSugerido = tal ? tal.actual + 1 : '';
    
    // Generadores de opciones
    let optsMiembros = '<option value="">-- Seleccionar / Anónimo --</option>';
    if (typeof miembrosActuales !== 'undefined') {
        miembrosActuales.forEach(m => optsMiembros += `<option value="${m.nombre}">${m.nombre}</option>`);
    }
    let optsCultos = tiposCultos.map(c => `<option value="${c}">${c}</option>`).join('');

    const html = `
        <div class="card main-card mb-5 border-success border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4">
                    <h5 class="text-dark fw-bold"><i class="bi bi-plus-circle-fill me-2 text-success"></i>Registrar Ingreso</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn-close"></button>
                </div>

                <form id="formIngreso">
                    <div class="row g-3">
                        
                        <div class="col-12 mb-2">
                            <div class="bg-light p-3 rounded-3 border d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-receipt-cutoff fs-3 text-success me-3"></i>
                                    <div>
                                        <small class="text-uppercase fw-bold text-muted" style="font-size: 0.7rem;">Talonario Activo</small>
                                        <div class="fw-bold text-dark">${tal ? tal.nombre : '<span class="text-danger">Ninguno</span>'}</div>
                                    </div>
                                </div>
                                <div class="flex-grow-1" style="max-width: 200px;">
                                    <label class="form-label small fw-bold mb-1">No. Recibo</label>
                                    <input type="number" id="numRecibo" class="form-control fw-bold text-end border-success" 
                                        placeholder="${tal ? siguienteSugerido : '-'}" ${!tal ? 'disabled' : ''}>
                                    <div id="reciboFeedback" class="small text-end mt-1" style="min-height:18px;"></div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase text-muted">Tipo de Ingreso</label>
                            <select class="form-select" id="tipoIngreso" onchange="toggleCultos(this.value)">
                                <option value="Ofrenda">Ofrenda</option>
                                <option value="Diezmo">Diezmo</option>
                                <option value="Actividad">Actividad / Evento</option>
                                <option value="Donacion">Donación Especial</option>
                            </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase text-muted">Monto (L.)</label>
                            <div class="input-group">
                                <span class="input-group-text fw-bold text-success bg-white border-end-0">L.</span>
                                <input type="number" step="0.01" id="montoIngreso" class="form-control fw-bold fs-5 border-start-0 ps-1 text-success" required>
                            </div>
                        </div>

                        <div class="col-md-6" id="divCultos">
                            <label class="form-label small fw-bold text-uppercase text-primary">Culto / Servicio</label>
                            <select class="form-select bg-primary bg-opacity-10 border-primary text-primary fw-bold" id="selectCulto">
                                <option value="General">No Aplica / General</option>
                                ${optsCultos}
                            </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase text-muted">Donante / Miembro</label>
                            <div class="input-group">
                                <select class="form-select" id="miembroIngreso">${optsMiembros}</select>
                                <button class="btn btn-outline-secondary" type="button" onclick="agregarMiembroRapido()" title="Nuevo Miembro">
                                    <i class="bi bi-person-plus-fill"></i>
                                </button>
                            </div>
                        </div>

                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase text-muted">Nota / Detalle</label>
                            <input type="text" id="detalleIngreso" class="form-control" placeholder="Ej: Venta de comida, Ofrenda pro-templo...">
                        </div>

                        <div class="col-12 text-end mt-4">
                            <button type="submit" class="btn btn-success fw-bold px-5 py-2 shadow-sm">Guardar Ingreso</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;

    setupValidacionRecibo(tal);

    document.getElementById('formIngreso').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarIngreso(tal);
    });
}

// Helpers Ingreso
function toggleCultos(val) {
    const div = document.getElementById('divCultos');
    const sel = document.getElementById('selectCulto');
    if (val === 'Ofrenda' || val === 'Actividad') {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
        sel.value = 'General';
    }
}

async function agregarMiembroRapido() {
    const { value: n } = await Swal.fire({ 
        title: 'Nuevo Donante', input: 'text', inputLabel: 'Nombre Completo', showCancelButton: true,
        inputValidator: (v) => !v && 'Escribe un nombre'
    });
    if (n && typeof miembrosActuales !== 'undefined') {
        miembrosActuales.push({ nombre: n });
        const sel = document.getElementById('miembroIngreso');
        const opt = document.createElement("option"); opt.text = n; opt.value = n; opt.selected = true;
        sel.add(opt);
        Swal.fire({ icon: 'success', title: 'Agregado', timer: 1000, showConfirmButton: false });
    }
}

function setupValidacionRecibo(tal) {
    const inp = document.getElementById('numRecibo');
    const feed = document.getElementById('reciboFeedback');
    inp.addEventListener('input', () => {
        if (!tal) return;
        const v = parseInt(inp.value);
        if (v < tal.inicio || v > tal.fin) {
            inp.classList.add('is-invalid'); inp.classList.remove('is-valid');
            feed.className = 'text-danger fw-bold small'; feed.innerText = '⚠️ Fuera de rango';
        } else if (tal.usados.includes(v)) {
            inp.classList.add('is-invalid'); inp.classList.remove('is-valid');
            feed.className = 'text-danger fw-bold small'; feed.innerText = '⛔ Ya existe';
        } else {
            inp.classList.remove('is-invalid'); inp.classList.add('is-valid');
            feed.className = 'text-success fw-bold small'; feed.innerText = '✅ Disponible';
        }
    });
}

function guardarIngreso(tal) {
    const inp = document.getElementById('numRecibo');
    const nRecibo = parseInt(inp.value);

    // Validación estricta de recibo
    if (tal) {
        if (!nRecibo) return Swal.fire('Error', 'Falta el número de recibo.', 'error');
        if (nRecibo < tal.inicio || nRecibo > tal.fin) return Swal.fire('Error', 'Recibo fuera de rango.', 'error');
        if (tal.usados.includes(nRecibo)) return Swal.fire('Error', 'El recibo ya está usado.', 'error');
        
        tal.usados.push(nRecibo);
        if (nRecibo > tal.actual) tal.actual = nRecibo;
    }

    const tipo = document.getElementById('tipoIngreso').value;
    const culto = document.getElementById('selectCulto').value;
    const miembro = document.getElementById('miembroIngreso').value;
    const detalle = document.getElementById('detalleIngreso').value;
    const monto = parseFloat(document.getElementById('montoIngreso').value);

    let desc = (tipo === 'Ofrenda') ? culto : tipo;
    if (miembro) desc += ` - ${miembro}`;
    if (detalle) desc += ` (${detalle})`;

    transacciones.unshift({
        fecha: new Date().toISOString(),
        tipo: 'ingreso',
        categoria: tipo,
        descripcion: desc,
        monto: monto,
        recibo: inp.value ? String(inp.value).padStart(6,'0') : 'S/N'
    });

    Swal.fire('Registrado', `Ingreso de ${formatoMoneda(monto)} guardado.`, 'success');
    cargarDashboardFinanzas();
}

// --- 3. NUEVO GASTO ---
function renderRegistrarEgreso() {
    let opts = categoriasEgresos.map(c => `<option value="${c}">${c}</option>`).join('');
    const html = `
        <div class="card main-card mb-5 border-danger border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4">
                    <h5 class="text-dark fw-bold"><i class="bi bi-dash-circle-fill me-2 text-danger"></i>Registrar Gasto</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn-close"></button>
                </div>
                <form id="formEgreso">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase text-muted">Categoría</label>
                            <select class="form-select" id="catEgreso">${opts}<option value="OTRO">OTRO</option></select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-uppercase text-muted">Monto (L.)</label>
                            <div class="input-group">
                                <span class="input-group-text fw-bold text-danger bg-white border-end-0">L.</span>
                                <input type="number" step="0.01" id="montoEgreso" class="form-control fw-bold fs-5 border-start-0 ps-1 text-danger" required>
                            </div>
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold text-uppercase text-muted">Descripción</label>
                            <textarea id="descEgreso" class="form-control" rows="2" placeholder="Detalles de la compra, factura..."></textarea>
                        </div>
                        <div class="col-12 text-end mt-4">
                            <button type="submit" class="btn btn-danger fw-bold px-5 py-2 shadow-sm">Registrar Salida</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;
    
    document.getElementById('formEgreso').addEventListener('submit', (e) => {
        e.preventDefault();
        transacciones.unshift({
            fecha: new Date().toISOString(),
            tipo: 'egreso',
            categoria: document.getElementById('catEgreso').value,
            descripcion: document.getElementById('descEgreso').value,
            monto: parseFloat(document.getElementById('montoEgreso').value),
            recibo: '-'
        });
        Swal.fire('Registrado', 'Gasto guardado correctamente.', 'success');
        cargarDashboardFinanzas();
    });
}

// --- 4. CONFIGURACIÓN PROFESIONAL ---
function renderConfigFinanzas() {
    let listaHTML = talonarios.map((t, i) => `
        <div class="col-12">
            <div class="card h-100 border shadow-sm">
                <div class="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div class="d-flex align-items-center">
                        <div class="bg-light p-3 rounded-circle me-3 text-primary"><i class="bi bi-bookmarks-fill fs-4"></i></div>
                        <div>
                            <h6 class="fw-bold mb-1 text-dark">${t.nombre}</h6>
                            <small class="text-muted d-block">Rango: <b>${t.inicio}</b> al <b>${t.fin}</b></small>
                            <small class="text-muted">Estado: ${t.activo ? '<span class="text-success fw-bold">Activo</span>' : '<span class="text-secondary">Inactivo</span>'}</small>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <div class="text-end me-3 d-none d-md-block">
                            <small class="d-block text-muted" style="font-size: 0.7rem;">ÚLTIMO RECIBO</small>
                            <span class="fw-bold fs-5">#${t.actual}</span>
                        </div>
                        ${!t.activo ? `<button onclick="activarTalonario(${i})" class="btn btn-outline-success btn-sm">Activar</button>` : ''}
                        
                        <div class="dropdown">
                            <button class="btn btn-light btn-sm border" data-bs-toggle="dropdown"><i class="bi bi-three-dots-vertical"></i></button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="verDetalleTalonario(${i})"><i class="bi bi-eye me-2"></i>Ver Recibos</a></li>
                                <li><a class="dropdown-item" href="#" onclick="editarTalonario(${i})"><i class="bi bi-pencil me-2"></i>Editar</a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="borrarTalonario(${i})"><i class="bi bi-trash me-2"></i>Borrar</a></li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between align-items-center mb-5">
                    <div>
                        <h4 class="text-dark fw-bold mb-0"><i class="bi bi-sliders me-2"></i>Configuración</h4>
                        <p class="text-muted small mb-0">Administra talonarios y categorías.</p>
                    </div>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-light border shadow-sm"><i class="bi bi-arrow-return-left me-2"></i>Volver</button>
                </div>

                <div class="row g-5">
                    <div class="col-lg-7">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold text-uppercase text-muted m-0 small">Gestión de Talonarios</h6>
                            <button onclick="nuevoTalonario()" class="btn btn-primary btn-sm fw-bold"><i class="bi bi-plus-lg me-1"></i>Nuevo</button>
                        </div>
                        <div class="row g-3">
                            ${listaHTML.length ? listaHTML : '<div class="text-center text-muted py-5 border rounded bg-light">No hay talonarios registrados</div>'}
                        </div>
                    </div>

                    <div class="col-lg-5">
                        <div class="p-4 bg-light rounded-4 h-100">
                            <h6 class="fw-bold text-uppercase text-muted small mb-3">Categorías de Gastos</h6>
                            <div class="input-group mb-3">
                                <input type="text" id="newCat" class="form-control" placeholder="Nueva Categoría...">
                                <button onclick="agregarCategoria()" class="btn btn-dark"><i class="bi bi-plus-lg"></i></button>
                            </div>
                            <div class="d-flex flex-wrap gap-2">
                                ${categoriasEgresos.map(c => `
                                    <span class="badge bg-white text-dark border shadow-sm py-2 px-3 rounded-pill d-flex align-items-center gap-2">
                                        ${c} 
                                        <i class="bi bi-x-circle-fill text-danger cursor-pointer" onclick="borrarCategoria('${c}')" style="cursor:pointer; opacity:0.6 hover:opacity:1"></i>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;
}

// --- LÓGICA DE TALONARIOS (EDICIÓN Y BORRADO) ---
async function nuevoTalonario() {
    const { value: f } = await Swal.fire({
        title: 'Nuevo Talonario',
        html: `
            <div class="text-start">
                <label class="small fw-bold mb-1">Nombre</label>
                <input id="sw1" class="swal2-input m-0 w-100 mb-3" placeholder="Ej: Serie B - 2026">
                <div class="row g-2">
                    <div class="col-6">
                        <label class="small fw-bold mb-1">Inicio</label>
                        <input id="sw2" type="number" class="swal2-input m-0 w-100" placeholder="101">
                    </div>
                    <div class="col-6">
                        <label class="small fw-bold mb-1">Fin</label>
                        <input id="sw3" type="number" class="swal2-input m-0 w-100" placeholder="200">
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        preConfirm: () => [document.getElementById('sw1').value, document.getElementById('sw2').value, document.getElementById('sw3').value]
    });

    if (f && f[0] && f[1] && f[2]) {
        talonarios.push({
            nombre: f[0],
            inicio: parseInt(f[1]),
            fin: parseInt(f[2]),
            actual: parseInt(f[1]) - 1,
            activo: talonarios.length === 0,
            usados: []
        });
        renderConfigFinanzas();
        Swal.fire({ icon: 'success', title: 'Creado', timer: 1500, showConfirmButton: false });
    }
}

async function editarTalonario(idx) {
    const t = talonarios[idx];
    const { value: f } = await Swal.fire({
        title: 'Editar Talonario',
        html: `
            <div class="text-start">
                <label class="small fw-bold mb-1">Nombre</label>
                <input id="sw1" class="swal2-input m-0 w-100 mb-3" value="${t.nombre}">
                <div class="row g-2">
                    <div class="col-6">
                        <label class="small fw-bold mb-1">Inicio</label>
                        <input id="sw2" type="number" class="swal2-input m-0 w-100 bg-light" value="${t.inicio}" ${t.usados.length > 0 ? 'disabled title="No puedes cambiar el inicio si ya hay recibos"' : ''}>
                    </div>
                    <div class="col-6">
                        <label class="small fw-bold mb-1">Fin</label>
                        <input id="sw3" type="number" class="swal2-input m-0 w-100" value="${t.fin}">
                    </div>
                </div>
                ${t.usados.length > 0 ? '<small class="text-danger mt-2 d-block">Nota: El inicio está bloqueado por seguridad.</small>' : ''}
            </div>
        `,
        focusConfirm: false,
        preConfirm: () => [document.getElementById('sw1').value, document.getElementById('sw2').value, document.getElementById('sw3').value]
    });

    if (f && f[0]) {
        t.nombre = f[0];
        if (t.usados.length === 0) { // Solo actualizamos inicio si está virgen
            t.inicio = parseInt(f[1]);
            t.actual = parseInt(f[1]) - 1; 
        }
        t.fin = parseInt(f[2]);
        renderConfigFinanzas();
        Swal.fire({ icon: 'success', title: 'Actualizado', timer: 1000, showConfirmButton: false });
    }
}

function borrarTalonario(idx) {
    Swal.fire({
        title: '¿Eliminar Talonario?',
        text: "Perderás el historial de recibos usados de esta serie.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, eliminar'
    }).then((result) => {
        if (result.isConfirmed) {
            talonarios.splice(idx, 1);
            renderConfigFinanzas();
            Swal.fire('Eliminado', '', 'success');
        }
    });
}

function verDetalleTalonario(idx) {
    const t = talonarios[idx];
    const lista = t.usados.length ? t.usados.sort((a,b)=>a-b).join(', ') : 'Ninguno';
    Swal.fire({
        title: `<span class="fs-5">${t.nombre}</span>`,
        html: `
            <div class="text-start bg-light p-3 rounded">
                <p class="mb-1"><b>Rango:</b> ${t.inicio} - ${t.fin}</p>
                <p class="mb-2"><b>Total Emitidos:</b> ${t.usados.length}</p>
                <hr>
                <small class="text-muted fw-bold">NÚMEROS USADOS:</small>
                <div class="mt-1" style="max-height: 100px; overflow-y: auto; font-family: monospace;">
                    ${lista}
                </div>
            </div>
        `
    });
}

function activarTalonario(idx) {
    talonarios.forEach(t => t.activo = false);
    talonarios[idx].activo = true;
    renderConfigFinanzas();
}

// --- HELPERS Y TABLA ---
function agregarCategoria() { const v = document.getElementById('newCat').value; if(v){ categoriasEgresos.push(v); renderConfigFinanzas(); } }
function borrarCategoria(c) { categoriasEgresos = categoriasEgresos.filter(i => i !== c); renderConfigFinanzas(); }

function calcularSaldo() {
    saldoActual = 0;
    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') saldoActual += t.monto;
        else saldoActual -= t.monto;
    });
}

function generarFilasTabla() {
    if (transacciones.length === 0) return '<tr><td colspan="5" class="text-center py-5 text-muted">Sin movimientos registrados</td></tr>';
    
    return transacciones.map(t => {
        const esIngreso = t.tipo === 'ingreso';
        const color = esIngreso ? 'text-success' : 'text-danger';
        const signo = esIngreso ? '+' : '-';
        
        // Recibo Badge
        let reciboBadge = '-';
        if (t.recibo === 'APERTURA') reciboBadge = '<span class="badge bg-warning text-dark border-0">APERTURA</span>';
        else if (t.recibo && t.recibo !== 'S/N' && t.recibo !== '-') reciboBadge = `<span class="badge bg-light text-dark border fw-normal">#${t.recibo}</span>`;

        return `
            <tr>
                <td data-label="Fecha" class="text-nowrap"><small class="fw-bold text-muted">${formatoFecha(t.fecha)}</small></td>
                <td data-label="Recibo">${reciboBadge}</td>
                <td data-label="Categoría">
                    <span class="badge rounded-pill ${esIngreso?'bg-success':'bg-danger'} bg-opacity-10 ${color} border border-opacity-25 fw-normal px-3">
                        ${t.categoria}
                    </span>
                </td>
                <td data-label="Descripción">
                    <span class="d-inline-block text-truncate" style="max-width: 200px;" title="${t.descripcion}">${t.descripcion}</span>
                </td>
                <td data-label="Monto" class="text-end">
                    <span class="fw-bold ${color} fs-6">${signo} ${formatoMoneda(t.monto)}</span>
                </td>
            </tr>
        `;
    }).join('');
}