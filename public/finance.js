// finance.js - Módulo Financiero v8 (Animaciones, Validaciones Pro y Talonarios Egresos)
console.log("Cargando Módulo Financiero v8...");

// --- VARIABLES GLOBALES ---
let talonariosIngreso = [];
let talonariosEgreso = [];
let categoriasEgresos = [];
let transacciones = [];
let saldoActual = 0;
const tiposCultos = ['Culto Dominical', 'Escuela Dominical', 'Culto de Oración', 'Culto de Enseñanza', 'Reunión de Jóvenes', 'Reunión de Damas', 'Vigilia'];

// --- FORMATOS ---
const formatoMoneda = (monto) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(monto);
const formatoFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    const userTimezoneOffset = fecha.getTimezoneOffset() * 60000;
    const fechaCorregida = new Date(fecha.getTime() + userTimezoneOffset);
    return fechaCorregida.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).replace('.', '').toUpperCase().replace(/ /g, '-');
};

// --- ESTILOS DINÁMICOS (ANIMACIONES) ---
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    .cat-chip { transition: all 0.3s ease; transform: scale(1); opacity: 1; }
    .cat-chip.entering { transform: scale(0.5); opacity: 0; }
    .cat-chip.leaving { transform: scale(0.8); opacity: 0; margin-right: -10px; }
    .form-control.is-invalid { background-image: none; border-color: #dc3545; }
    .form-control.is-valid { background-image: none; border-color: #198754; }
    .validation-msg { font-size: 0.75rem; font-weight: 600; margin-top: 4px; transition: all 0.2s; }
`;
document.head.appendChild(styleSheet);

// --- AUTH FETCH ---
async function authFetch(url, options = {}) {
    const token = localStorage.getItem('token');
    if (!token) {
        Swal.fire('Sesión Expirada', 'Inicia sesión nuevamente', 'warning');
        window.location.reload();
        throw new Error('No token');
    }
    const headers = { 'Content-Type': 'application/json', 'Authorization': token, ...options.headers };
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error en servidor');
    }
    return response.json();
}

// --- CARGA INICIAL ---
async function cargarDashboardFinanzas() {
    const contenedor = document.getElementById('vistaFinanzas');
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Sincronizando...</p></div>';

    try {
        const data = await authFetch('/api/finanzas/datos');
        transacciones = data.transacciones;
        categoriasEgresos = data.categorias;
        
        // Procesar Talonarios (Ingreso vs Egreso)
        const todosTalonarios = data.talonarios.map(t => ({
            ...t,
            inicio: t.rango_inicio, fin: t.rango_fin, // Adaptador de nombres DB a JS
            usados: []
        }));

        // Calcular usados cruzando con transacciones
        todosTalonarios.forEach(tal => {
            const tipoTx = tal.tipo === 'egreso' ? 'egreso' : 'ingreso';
            const recibos = transacciones
                .filter(tx => tx.tipo === tipoTx && tx.recibo_no !== 'S/N' && tx.recibo_no !== 'APERTURA' && tx.recibo_no !== '-')
                .map(tx => parseInt(tx.recibo_no))
                .filter(num => num >= tal.inicio && num <= tal.fin);
            tal.usados = recibos;
        });

        talonariosIngreso = todosTalonarios.filter(t => t.tipo === 'ingreso');
        talonariosEgreso = todosTalonarios.filter(t => t.tipo === 'egreso');

        calcularSaldo();
        renderizarVistaPrincipal();

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<div class="alert alert-danger m-4">Error: ${error.message}</div>`;
    }
}

// --- VISTA PRINCIPAL ---
function renderizarVistaPrincipal() {
    const contenedor = document.getElementById('vistaFinanzas');
    let html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-lg-5">
                <div class="row align-items-center mb-5 gy-3">
                    <div class="col-md-7">
                        <h4 class="text-primary fw-bold mb-1"><i class="bi bi-wallet2 me-2"></i>Finanzas & Tesorería</h4>
                        <p class="text-muted small mb-0">Control integral de caja.</p>
                    </div>
                    <div class="col-md-5">
                        <div class="card bg-primary text-white border-0 shadow-sm">
                            <div class="card-body py-3 px-4 d-flex justify-content-between align-items-center">
                                <div><small class="text-white-50 text-uppercase fw-bold" style="font-size: 0.7rem;">Saldo Disponible</small><h2 class="fw-bold mb-0">${formatoMoneda(saldoActual)}</h2></div>
                                <i class="bi bi-safe2-fill fs-1 text-white-50"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-grid gap-3 d-md-flex justify-content-md-center mb-5">
                    <button onclick="renderAperturaCuenta()" class="btn btn-outline-warning text-dark fw-bold px-4 py-2 shadow-sm rounded-3"><i class="bi bi-sliders me-2"></i>Ajuste</button>
                    <button onclick="renderRegistrarIngreso()" class="btn btn-success fw-bold px-4 py-2 shadow-sm rounded-3"><i class="bi bi-arrow-down-circle-fill me-2"></i>Ingreso</button>
                    <button onclick="renderRegistrarEgreso()" class="btn btn-danger fw-bold px-4 py-2 shadow-sm rounded-3"><i class="bi bi-arrow-up-circle-fill me-2"></i>Gasto</button>
                    <button onclick="renderConfigFinanzas()" class="btn btn-light text-secondary border px-3 py-2 shadow-sm rounded-3" title="Configuración"><i class="bi bi-gear-wide-connected fs-5"></i></button>
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

// --- APERTURA ---
function renderAperturaCuenta() {
    // (Mismo código de V7, abreviado aquí por espacio, funciona igual)
    // ... Copia la función renderAperturaCuenta del código anterior o usa esta lógica básica ...
    const saldoExistente = transacciones.find(t => t.categoria === 'SALDO INICIAL');
    const valorActual = saldoExistente ? saldoExistente.monto : '';
    const fechaActual = saldoExistente ? new Date(saldoExistente.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const html = `
        <div class="card main-card mb-5 border-warning border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4"><h5 class="text-dark fw-bold">Apertura de Caja</h5><button onclick="cargarDashboardFinanzas()" class="btn-close"></button></div>
                <form id="formApertura">
                    <div class="row g-4">
                        <div class="col-md-6"><label class="form-label fw-bold small">Monto Inicial</label><input type="number" step="0.01" id="montoApertura" class="form-control form-control-lg fw-bold" value="${valorActual}" required></div>
                        <div class="col-md-6"><label class="form-label fw-bold small">Fecha Corte</label><input type="date" id="fechaApertura" class="form-control form-control-lg" value="${fechaActual}"></div>
                        <div class="col-12 text-end mt-4"><button type="submit" class="btn btn-warning fw-bold px-5">Guardar</button></div>
                    </div>
                </form>
            </div>
        </div>`;
    document.getElementById('vistaFinanzas').innerHTML = html;
    document.getElementById('formApertura').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await authFetch('/api/finanzas/transacciones', {
                method: 'POST',
                body: JSON.stringify({ fecha: document.getElementById('fechaApertura').value, tipo: 'ingreso', categoria: 'SALDO INICIAL', descripcion: 'Apertura', monto: parseFloat(document.getElementById('montoApertura').value), recibo_no: 'APERTURA' })
            });
            Swal.fire('Guardado', 'Saldo inicial registrado.', 'success');
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- REGISTRAR INGRESO (VALIDACIÓN PRO) ---
function renderRegistrarIngreso() {
    const tal = talonariosIngreso.find(t => t.activo);
    const siguienteSugerido = tal ? tal.actual + 1 : '';
    let optsMiembros = '<option value="">-- Seleccionar / Anónimo --</option>';
    if (typeof miembrosActuales !== 'undefined') miembrosActuales.forEach(m => optsMiembros += `<option value="${m.nombre}">${m.nombre}</option>`);
    let optsCultos = tiposCultos.map(c => `<option value="${c}">${c}</option>`).join('');

    const html = `
        <div class="card main-card mb-5 border-success border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4"><h5 class="text-dark fw-bold text-success"><i class="bi bi-plus-circle-fill me-2"></i>Ingreso</h5><button onclick="cargarDashboardFinanzas()" class="btn-close"></button></div>
                <form id="formIngreso">
                    <div class="row g-3">
                        <div class="col-12 mb-2">
                            <div class="bg-light p-3 rounded-3 border d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-receipt-cutoff fs-3 text-success me-3"></i>
                                    <div><small class="text-uppercase fw-bold text-muted" style="font-size: 0.7rem;">Talonario Ingresos</small><div class="fw-bold text-dark">${tal ? tal.nombre : '<span class="text-danger">Ninguno Activo</span>'}</div></div>
                                </div>
                                <div style="width: 150px;">
                                    <label class="form-label small fw-bold mb-1">Recibo #</label>
                                    <input type="number" id="numRecibo" class="form-control fw-bold text-end border-success" placeholder="${tal ? siguienteSugerido : '-'}" ${!tal ? 'disabled' : ''}>
                                    <div id="reciboFeedback" class="validation-msg text-end"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">TIPO</label><select class="form-select" id="tipoIngreso" onchange="toggleCultos(this.value)"><option value="Ofrenda">Ofrenda</option><option value="Diezmo">Diezmo</option><option value="Actividad">Actividad</option><option value="Donacion">Donación</option></select></div>
                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">MONTO</label><div class="input-group"><span class="input-group-text fw-bold text-success bg-white">L.</span><input type="number" step="0.01" id="montoIngreso" class="form-control fw-bold fs-5 text-success border-start-0" required></div></div>
                        <div class="col-md-6" id="divCultos"><label class="form-label small fw-bold text-primary">CULTO</label><select class="form-select bg-primary bg-opacity-10 border-primary text-primary fw-bold" id="selectCulto"><option value="General">General</option>${optsCultos}</select></div>
                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">DONANTE</label><div class="input-group"><select class="form-select" id="miembroIngreso">${optsMiembros}</select><button class="btn btn-outline-secondary" type="button" onclick="agregarMiembroRapido()"><i class="bi bi-person-plus-fill"></i></button></div></div>
                        <div class="col-12"><label class="form-label small fw-bold text-muted">NOTA</label><input type="text" id="detalleIngreso" class="form-control"></div>
                        <div class="col-12 text-end mt-4"><button type="submit" class="btn btn-success fw-bold px-5 py-2 shadow-sm" id="btnGuardarIngreso">Guardar</button></div>
                    </div>
                </form>
            </div>
        </div>`;
    document.getElementById('vistaFinanzas').innerHTML = html;
    
    // Validación Pro
    setupValidacionRecibo(tal, 'numRecibo', 'reciboFeedback', 'btnGuardarIngreso');

    document.getElementById('formIngreso').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nRecibo = parseInt(document.getElementById('numRecibo').value);
        if (tal && (isNaN(nRecibo) || nRecibo < tal.inicio || nRecibo > tal.fin || tal.usados.includes(nRecibo))) return Swal.fire('Error', 'Recibo inválido', 'error');

        const tipo = document.getElementById('tipoIngreso').value;
        const culto = document.getElementById('selectCulto').value;
        const miembro = document.getElementById('miembroIngreso').value;
        let desc = (tipo === 'Ofrenda') ? culto : tipo;
        if (miembro) desc += ` - ${miembro}`;
        if (document.getElementById('detalleIngreso').value) desc += ` (${document.getElementById('detalleIngreso').value})`;

        try {
            await authFetch('/api/finanzas/transacciones', {
                method: 'POST',
                body: JSON.stringify({
                    fecha: new Date().toISOString(), tipo: 'ingreso', categoria: tipo, descripcion: desc,
                    monto: parseFloat(document.getElementById('montoIngreso').value),
                    recibo_no: nRecibo ? String(nRecibo).padStart(6,'0') : 'S/N'
                })
            });
            if (tal && nRecibo > tal.actual) {
                await authFetch(`/api/finanzas/talonarios/${tal.id}`, { method: 'PUT', body: JSON.stringify({ actual: nRecibo, tipo: 'ingreso' }) });
            }
            Swal.fire('Guardado', 'Ingreso registrado.', 'success');
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- REGISTRAR GASTO (AHORA CON TALONARIO) ---
function renderRegistrarEgreso() {
    const tal = talonariosEgreso.find(t => t.activo);
    const siguienteSugerido = tal ? tal.actual + 1 : '';
    const cats = categoriasEgresos.length > 0 ? categoriasEgresos.map(c => c.nombre) : ['Varios'];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');

    const html = `
        <div class="card main-card mb-5 border-danger border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4"><h5 class="text-dark fw-bold text-danger"><i class="bi bi-dash-circle-fill me-2"></i>Gasto</h5><button onclick="cargarDashboardFinanzas()" class="btn-close"></button></div>
                <form id="formEgreso">
                    <div class="row g-3">
                        
                        <div class="col-12 mb-2">
                            <div class="bg-light p-3 rounded-3 border d-flex flex-wrap align-items-center justify-content-between gap-3">
                                <div class="d-flex align-items-center">
                                    <i class="bi bi-file-earmark-spreadsheet-fill fs-3 text-danger me-3"></i>
                                    <div><small class="text-uppercase fw-bold text-muted" style="font-size: 0.7rem;">Chequera / Voucher</small><div class="fw-bold text-dark">${tal ? tal.nombre : '<span class="text-secondary">Sin Talonario</span>'}</div></div>
                                </div>
                                <div style="width: 150px;">
                                    <label class="form-label small fw-bold mb-1">Doc #</label>
                                    <input type="number" id="numDoc" class="form-control fw-bold text-end border-danger" placeholder="${tal ? siguienteSugerido : 'S/N'}" ${!tal ? 'disabled' : ''}>
                                    <div id="docFeedback" class="validation-msg text-end"></div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">CATEGORÍA</label><select class="form-select" id="catEgreso">${opts}<option value="OTRO">OTRO</option></select></div>
                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">MONTO</label><div class="input-group"><span class="input-group-text fw-bold text-danger bg-white">L.</span><input type="number" step="0.01" id="montoEgreso" class="form-control fw-bold fs-5 text-danger border-start-0" required></div></div>
                        <div class="col-12"><label class="form-label small fw-bold text-muted">DESCRIPCIÓN</label><textarea id="descEgreso" class="form-control" rows="2" placeholder="Detalles..."></textarea></div>
                        <div class="col-12 text-end mt-4"><button type="submit" class="btn btn-danger fw-bold px-5 py-2 shadow-sm" id="btnGuardarEgreso">Registrar</button></div>
                    </div>
                </form>
            </div>
        </div>`;
    document.getElementById('vistaFinanzas').innerHTML = html;
    
    // Validación Pro
    setupValidacionRecibo(tal, 'numDoc', 'docFeedback', 'btnGuardarEgreso');

    document.getElementById('formEgreso').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nDoc = parseInt(document.getElementById('numDoc').value);
        if (tal && (isNaN(nDoc) || nDoc < tal.inicio || nDoc > tal.fin || tal.usados.includes(nDoc))) return Swal.fire('Error', 'Número de documento inválido', 'error');

        try {
            await authFetch('/api/finanzas/transacciones', {
                method: 'POST',
                body: JSON.stringify({
                    fecha: new Date().toISOString(), tipo: 'egreso',
                    categoria: document.getElementById('catEgreso').value,
                    descripcion: document.getElementById('descEgreso').value,
                    monto: parseFloat(document.getElementById('montoEgreso').value),
                    recibo_no: nDoc ? String(nDoc).padStart(6,'0') : '-'
                })
            });
            if (tal && nDoc > tal.actual) {
                await authFetch(`/api/finanzas/talonarios/${tal.id}`, { method: 'PUT', body: JSON.stringify({ actual: nDoc, tipo: 'egreso' }) });
            }
            Swal.fire('Guardado', 'Gasto registrado.', 'success');
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- CONFIGURACIÓN (TABS Y ANIMACIONES) ---
function renderConfigFinanzas() {
    // Generador de listas de talonarios
    const renderTalonarioCard = (t, idx, type) => `
        <div class="col-12">
            <div class="card h-100 border shadow-sm">
                <div class="card-body d-flex align-items-center justify-content-between flex-wrap gap-3">
                    <div class="d-flex align-items-center">
                        <div class="bg-light p-3 rounded-circle me-3 ${type==='ingreso'?'text-success':'text-danger'}"><i class="bi bi-bookmarks-fill fs-4"></i></div>
                        <div>
                            <h6 class="fw-bold mb-1 text-dark">${t.nombre}</h6>
                            <small class="text-muted d-block">Rango: <b>${t.inicio}</b> - <b>${t.fin}</b></small>
                            <small>${t.activo ? '<span class="text-success fw-bold">Activo</span>' : '<span class="text-muted">Inactivo</span>'}</small>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        <div class="text-end me-3 d-none d-md-block"><small class="d-block text-muted" style="font-size: 0.7rem;">ÚLTIMO</small><span class="fw-bold fs-5">#${t.actual}</span></div>
                        ${!t.activo ? `<button onclick="activarTalonario(${t.id}, '${type}')" class="btn btn-outline-dark btn-sm">Activar</button>` : ''}
                        <button class="btn btn-light btn-sm border" onclick="borrarTalonario(${t.id})"><i class="bi bi-trash text-danger"></i></button>
                    </div>
                </div>
            </div>
        </div>`;

    const listaIng = talonariosIngreso.map((t, i) => renderTalonarioCard(t, i, 'ingreso')).join('') || '<p class="text-muted text-center py-3">No hay talonarios de ingresos.</p>';
    const listaEgr = talonariosEgreso.map((t, i) => renderTalonarioCard(t, i, 'egreso')).join('') || '<p class="text-muted text-center py-3">No hay chequeras de egresos.</p>';

    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between align-items-center mb-5">
                    <h4 class="text-dark fw-bold mb-0"><i class="bi bi-sliders me-2"></i>Configuración</h4>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-light border shadow-sm"><i class="bi bi-arrow-return-left me-2"></i>Volver</button>
                </div>

                <div class="row g-5">
                    <div class="col-lg-7">
                        <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
                            <li class="nav-item"><button class="nav-link active fw-bold" data-bs-toggle="pill" data-bs-target="#tab-ingresos">Ingresos</button></li>
                            <li class="nav-item"><button class="nav-link fw-bold" data-bs-toggle="pill" data-bs-target="#tab-egresos">Egresos</button></li>
                        </ul>
                        <div class="tab-content" id="pills-tabContent">
                            <div class="tab-pane fade show active" id="tab-ingresos">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h6 class="fw-bold text-uppercase text-muted m-0 small">Recibos de Ingreso</h6>
                                    <button onclick="nuevoTalonario('ingreso')" class="btn btn-success btn-sm fw-bold"><i class="bi bi-plus-lg me-1"></i>Nuevo</button>
                                </div>
                                <div class="row g-3">${listaIng}</div>
                            </div>
                            <div class="tab-pane fade" id="tab-egresos">
                                <div class="d-flex justify-content-between align-items-center mb-3">
                                    <h6 class="fw-bold text-uppercase text-muted m-0 small">Chequeras / Vouchers</h6>
                                    <button onclick="nuevoTalonario('egreso')" class="btn btn-danger btn-sm fw-bold"><i class="bi bi-plus-lg me-1"></i>Nuevo</button>
                                </div>
                                <div class="row g-3">${listaEgr}</div>
                            </div>
                        </div>
                    </div>

                    <div class="col-lg-5">
                        <div class="p-4 bg-light rounded-4 h-100">
                            <h6 class="fw-bold text-uppercase text-muted small mb-3">Categorías de Gastos</h6>
                            <div class="input-group mb-3">
                                <input type="text" id="newCat" class="form-control" placeholder="Nueva Categoría...">
                                <button onclick="agregarCategoria()" class="btn btn-dark"><i class="bi bi-plus-lg"></i></button>
                            </div>
                            <div class="d-flex flex-wrap gap-2" id="listaCategorias">
                                ${categoriasEgresos.map(c => `
                                    <span class="badge bg-white text-dark border shadow-sm py-2 px-3 rounded-pill d-flex align-items-center gap-2 cat-chip">
                                        ${c.nombre} 
                                        <i class="bi bi-x-circle-fill text-danger cursor-pointer" onclick="borrarCategoria(${c.id}, this)" style="opacity:0.6"></i>
                                    </span>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    document.getElementById('vistaFinanzas').innerHTML = html;
}

// --- VALIDACIÓN PROFESIONAL (Sin Emojis) ---
function setupValidacionRecibo(tal, inputId, feedbackId, btnId) {
    const inp = document.getElementById(inputId);
    const feed = document.getElementById(feedbackId);
    const btn = document.getElementById(btnId);

    inp.addEventListener('input', () => {
        if (!tal) return;
        const v = parseInt(inp.value);
        inp.classList.remove('is-invalid', 'is-valid');
        btn.disabled = false;

        if (isNaN(v)) {
            feed.innerHTML = ''; 
            return;
        }

        if (v < tal.inicio || v > tal.fin) {
            inp.classList.add('is-invalid');
            feed.innerHTML = '<i class="bi bi-exclamation-circle me-1"></i>Fuera de rango';
            feed.className = 'validation-msg text-danger text-end';
            btn.disabled = true;
        } else if (tal.usados.includes(v)) {
            inp.classList.add('is-invalid');
            feed.innerHTML = '<i class="bi bi-file-earmark-x me-1"></i>Ya utilizado';
            feed.className = 'validation-msg text-danger text-end';
            btn.disabled = true;
        } else {
            inp.classList.add('is-valid');
            feed.innerHTML = '<i class="bi bi-check-circle me-1"></i>Disponible';
            feed.className = 'validation-msg text-success text-end';
        }
    });
}

// --- FUNCIONES LOGICA (Con Animations) ---
async function agregarCategoria() {
    const v = document.getElementById('newCat').value;
    if(v) {
        const span = document.createElement("span"); // Placeholder para animación
        span.className = "badge bg-white text-dark border shadow-sm py-2 px-3 rounded-pill d-flex align-items-center gap-2 cat-chip entering";
        span.innerHTML = `${v} <i class="bi bi-hourglass-split text-muted"></i>`;
        document.getElementById('listaCategorias').appendChild(span);
        
        // Reflow para activar animación
        requestAnimationFrame(() => span.classList.remove("entering"));

        await authFetch('/api/finanzas/categorias', { method: 'POST', body: JSON.stringify({ nombre: v }) });
        renderConfigFinanzas(); 
    }
}

async function borrarCategoria(id, el) {
    // Animación de Salida
    const chip = el.closest('.cat-chip');
    chip.classList.add('leaving');
    setTimeout(async () => {
        await authFetch(`/api/finanzas/categorias/${id}`, { method: 'DELETE' });
        renderConfigFinanzas();
    }, 300); // Esperar a que termine la animación CSS
}

async function nuevoTalonario(tipo) {
    const { value: f } = await Swal.fire({
        title: `Nuevo Talonario (${tipo})`,
        html: `<input id="sw1" class="swal2-input" placeholder="Nombre (Ej: Serie B)"><div class="row g-2"><div class="col-6"><input id="sw2" type="number" class="swal2-input" placeholder="Inicio"></div><div class="col-6"><input id="sw3" type="number" class="swal2-input" placeholder="Fin"></div></div>`,
        focusConfirm: false,
        preConfirm: () => [document.getElementById('sw1').value, document.getElementById('sw2').value, document.getElementById('sw3').value]
    });

    if (f && f[0]) {
        try {
            await authFetch('/api/finanzas/talonarios', {
                method: 'POST',
                body: JSON.stringify({ nombre: f[0], inicio: parseInt(f[1]), fin: parseInt(f[2]), actual: parseInt(f[1])-1, tipo: tipo })
            });
            renderConfigFinanzas();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }
}

async function activarTalonario(id, tipo) {
    await authFetch(`/api/finanzas/talonarios/${id}`, { method: 'PUT', body: JSON.stringify({ activo: true, tipo: tipo }) });
    renderConfigFinanzas();
}

async function borrarTalonario(id) {
    Swal.fire({ title: '¿Borrar?', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => {
        if (r.isConfirmed) { await authFetch(`/api/finanzas/talonarios/${id}`, { method: 'DELETE' }); renderConfigFinanzas(); }
    });
}

// Helpers
function toggleCultos(val) { const div = document.getElementById('divCultos'); if (val === 'Ofrenda' || val === 'Actividad') { div.style.display = 'block'; } else { div.style.display = 'none'; document.getElementById('selectCulto').value = 'General'; } }
async function agregarMiembroRapido() { const { value: n } = await Swal.fire({ title: 'Nuevo', input: 'text', showCancelButton: true }); if (n) { miembrosActuales.push({ nombre: n }); const sel = document.getElementById('miembroIngreso'); const opt = document.createElement("option"); opt.text = n; opt.value = n; opt.selected = true; sel.add(opt); } }
function calcularSaldo() { saldoActual = 0; transacciones.forEach(t => { if (t.tipo === 'ingreso') saldoActual += parseFloat(t.monto); else saldoActual -= parseFloat(t.monto); }); }
function generarFilasTabla() {
    if (!transacciones.length) return '<tr><td colspan="5" class="text-center py-5 text-muted">Sin movimientos</td></tr>';
    return transacciones.map(t => {
        const esIngreso = t.tipo === 'ingreso';
        let reciboBadge = '-';
        if (t.recibo_no === 'APERTURA') reciboBadge = '<span class="badge bg-warning text-dark border-0">APERTURA</span>';
        else if (t.recibo_no && t.recibo_no !== 'S/N' && t.recibo_no !== '-') reciboBadge = `<span class="badge bg-light text-dark border fw-normal">#${t.recibo_no}</span>`;
        return `<tr><td data-label="Fecha"><small class="fw-bold text-muted">${formatoFecha(t.fecha)}</small></td><td data-label="Recibo">${reciboBadge}</td><td data-label="Categoría"><span class="badge rounded-pill ${esIngreso?'bg-success':'bg-danger'} bg-opacity-10 ${esIngreso?'text-success':'text-danger'} border border-opacity-25 fw-normal px-3">${t.categoria}</span></td><td data-label="Descripción"><span class="d-inline-block text-truncate" style="max-width: 200px;" title="${t.descripcion}">${t.descripcion}</span></td><td data-label="Monto" class="text-end"><span class="fw-bold ${esIngreso?'text-success':'text-danger'} fs-6">${esIngreso?'+':'-'} ${formatoMoneda(t.monto)}</span></td></tr>`;
    }).join('');
}