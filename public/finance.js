// finance.js - Módulo Financiero v13 (Estable, Legible y Reparado)
console.log("Cargando Módulo Financiero v13...");

// --- VARIABLES GLOBALES ---
let talonariosIngreso = [];
let talonariosEgreso = [];
let categoriasEgresos = [];
let transacciones = [];
let miembrosActuales = []; 
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

// --- ESTILOS VISUALES (Inyectados con seguridad) ---
try {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        .cat-chip { transition: all 0.2s ease; border: 1px solid #dee2e6; }
        .cat-chip:hover { background-color: #f8f9fa; transform: translateY(-1px); box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
        .cat-chip.leaving { opacity: 0; transform: scale(0.8); }
        .ticket-card { border: 1px solid #e9ecef; border-left-width: 5px; background: #fff; transition: transform 0.2s; }
        .ticket-card:hover { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,0,0,0.08) !important; }
        .ticket-ingreso { border-left-color: #198754; }
        .ticket-egreso { border-left-color: #dc3545; }
        .nav-pills .nav-link.active { background-color: #0d6efd; box-shadow: 0 4px 6px rgba(13, 110, 253, 0.2); }
        .validation-msg { font-size: 0.75rem; font-weight: 600; margin-top: 4px; }
    `;
    document.head.appendChild(styleSheet);
} catch (e) {
    console.error("Error aplicando estilos de finanzas:", e);
}

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
    if (!contenedor) return; // Protección por si no existe el div
    
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Cargando sistema...</p></div>';

    try {
        // Cargar Datos Financieros y Miembros
        const [dataFinanzas, dataMiembros] = await Promise.all([
            authFetch('/api/finanzas/datos'),
            authFetch('/api/miembros')
        ]);

        transacciones = dataFinanzas.transacciones;
        categoriasEgresos = dataFinanzas.categorias;
        miembrosActuales = dataMiembros;

        const todosTalonarios = dataFinanzas.talonarios.map(t => ({
            ...t, inicio: t.rango_inicio, fin: t.rango_fin, usados: []
        }));

        todosTalonarios.forEach(tal => {
            const tipoTx = tal.tipo === 'egreso' ? 'egreso' : 'ingreso';
            const recibos = transacciones
                .filter(tx => tx.tipo === tipoTx && tx.recibo_no && tx.recibo_no !== 'S/N' && tx.recibo_no !== 'APERTURA' && tx.recibo_no !== '-')
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
        contenedor.innerHTML = `<div class="alert alert-danger m-4">Error cargando finanzas: ${error.message}</div>`;
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
                        <h4 class="text-primary fw-bold mb-1"><i class="bi bi-wallet2 me-2"></i>Finanzas</h4>
                        <p class="text-muted small mb-0">Control de Tesorería</p>
                    </div>
                    <div class="col-md-5">
                        <div class="card bg-primary text-white border-0 shadow-sm" style="background: linear-gradient(45deg, #0d6efd, #0a58ca);">
                            <div class="card-body py-3 px-4 d-flex justify-content-between align-items-center">
                                <div><small class="text-white-50 text-uppercase fw-bold" style="font-size: 0.7rem;">Disponible</small><h2 class="fw-bold mb-0">${formatoMoneda(saldoActual)}</h2></div>
                                <i class="bi bi-safe2-fill fs-1 text-white-50"></i>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="d-grid gap-3 d-md-flex justify-content-md-center mb-5">
                    <button onclick="renderAperturaCuenta()" class="btn btn-outline-warning text-dark fw-bold px-4 py-2 shadow-sm rounded-pill"><i class="bi bi-sliders me-2"></i>Ajuste</button>
                    <button onclick="renderRegistrarIngreso()" class="btn btn-success fw-bold px-4 py-2 shadow-sm rounded-pill"><i class="bi bi-arrow-down-circle-fill me-2"></i>Ingreso</button>
                    <button onclick="renderRegistrarEgreso()" class="btn btn-danger fw-bold px-4 py-2 shadow-sm rounded-pill"><i class="bi bi-arrow-up-circle-fill me-2"></i>Gasto</button>
                    <button onclick="renderConfigFinanzas()" class="btn btn-light text-secondary border px-3 py-2 shadow-sm rounded-circle" title="Configuración"><i class="bi bi-gear-fill"></i></button>
                </div>

                <div class="table-responsive">
                    <table class="table table-custom table-hover align-middle">
                        <thead class="bg-light">
                            <tr>
                                <th style="width: 15%;">Fecha</th>
                                <th style="width: 10%;">Recibo</th>
                                <th style="width: 20%;">Categoría</th>
                                <th style="width: 35%;">Descripción</th>
                                <th style="width: 20%; text-align: right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody class="fs-6 border-top-0">${generarFilasTabla()}</tbody>
                    </table>
                </div>
            </div>
        </div>`;
    contenedor.innerHTML = html;
}

// --- CONFIGURACIÓN ---
function renderConfigFinanzas() {
    const cardHTML = (t, idx, type) => {
        const colorClass = type === 'ingreso' ? 'text-success' : 'text-danger';
        const borderClass = type === 'ingreso' ? 'ticket-ingreso' : 'ticket-egreso';
        const badge = t.activo 
            ? `<span class="badge bg-success bg-opacity-10 text-success border border-success px-2">ACTIVO</span>` 
            : `<span class="badge bg-secondary bg-opacity-10 text-secondary border px-2">INACTIVO</span>`;

        return `
        <div class="col-md-6 col-lg-12 col-xl-6">
            <div class="card h-100 shadow-sm ticket-card ${borderClass} p-3">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div><h6 class="fw-bold mb-1 text-dark">${t.nombre}</h6><div class="small text-muted">Rango: <span class="fw-bold text-dark">${t.inicio}</span> al <span class="fw-bold text-dark">${t.fin}</span></div></div>
                    ${badge}
                </div>
                <div class="d-flex justify-content-between align-items-end mt-2">
                    <div><small class="text-muted d-block" style="font-size:0.7rem;">ÚLTIMO</small><span class="fs-4 fw-bold ${colorClass}">#${t.actual}</span></div>
                    <div class="btn-group">
                        ${!t.activo ? `<button onclick="activarTalonario(${t.id}, '${type}')" class="btn btn-sm btn-outline-dark" title="Activar"><i class="bi bi-power"></i></button>` : ''}
                        <button class="btn btn-sm btn-light border" onclick="editarTalonario('${type}', ${idx})" title="Editar"><i class="bi bi-pencil-square text-primary"></i></button>
                        <button class="btn btn-sm btn-light border" onclick="borrarTalonario(${t.id})" title="Borrar"><i class="bi bi-trash3 text-danger"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    };

    const listaIng = talonariosIngreso.map((t, i) => cardHTML(t, i, 'ingreso')).join('') || '<div class="col-12 text-center py-4 text-muted border rounded bg-light">No hay talonarios</div>';
    const listaEgr = talonariosEgreso.map((t, i) => cardHTML(t, i, 'egreso')).join('') || '<div class="col-12 text-center py-4 text-muted border rounded bg-light">No hay talonarios</div>';

    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h4 class="text-dark fw-bold m-0"><i class="bi bi-sliders me-2"></i>Configuración</h4>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-light border shadow-sm rounded-pill px-3"><i class="bi bi-arrow-left me-2"></i>Volver</button>
                </div>
                <div class="row g-5">
                    <div class="col-lg-7">
                        <ul class="nav nav-pills mb-4" id="pills-tab" role="tablist">
                            <li class="nav-item me-2"><button class="nav-link active rounded-pill px-4" data-bs-toggle="pill" data-bs-target="#tab-ingresos">Ingresos</button></li>
                            <li class="nav-item"><button class="nav-link rounded-pill px-4" data-bs-toggle="pill" data-bs-target="#tab-egresos">Egresos</button></li>
                        </ul>
                        <div class="tab-content">
                            <div class="tab-pane fade show active" id="tab-ingresos">
                                <div class="d-flex justify-content-between align-items-center mb-3"><small class="text-uppercase text-muted fw-bold">Recibos de Ingreso</small><button onclick="nuevoTalonario('ingreso')" class="btn btn-success btn-sm fw-bold rounded-pill px-3"><i class="bi bi-plus-lg me-1"></i>Nuevo</button></div>
                                <div class="row g-3">${listaIng}</div>
                            </div>
                            <div class="tab-pane fade" id="tab-egresos">
                                <div class="d-flex justify-content-between align-items-center mb-3"><small class="text-uppercase text-muted fw-bold">Vouchers / Chequeras</small><button onclick="nuevoTalonario('egreso')" class="btn btn-danger btn-sm fw-bold rounded-pill px-3"><i class="bi bi-plus-lg me-1"></i>Nuevo</button></div>
                                <div class="row g-3">${listaEgr}</div>
                            </div>
                        </div>
                    </div>
                    <div class="col-lg-5">
                        <div class="bg-light p-4 rounded-4 h-100 border">
                            <h6 class="fw-bold text-dark mb-3"><i class="bi bi-tags-fill me-2 text-muted"></i>Categorías</h6>
                            <div class="input-group mb-3"><input type="text" id="newCat" class="form-control border-0 shadow-sm" placeholder="Nueva..."><button onclick="agregarCategoria()" class="btn btn-dark shadow-sm"><i class="bi bi-plus-lg"></i></button></div>
                            <div class="d-flex flex-wrap gap-2" id="listaCategorias">${categoriasEgresos.map(c => `<span class="badge bg-white text-dark shadow-sm py-2 px-3 rounded-pill d-flex align-items-center gap-2 cat-chip">${c.nombre} <i class="bi bi-x-circle-fill text-danger cursor-pointer ms-1" onclick="borrarCategoria(${c.id}, this)" style="opacity:0.5; font-size:1.1em;"></i></span>`).join('')}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    document.getElementById('vistaFinanzas').innerHTML = html;
}

// --- APERTURA ---
function renderAperturaCuenta() {
    const saldoExistente = transacciones.find(t => t.categoria === 'SALDO INICIAL');
    const valorActual = saldoExistente ? saldoExistente.monto : '';
    const fechaActual = saldoExistente ? new Date(saldoExistente.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const html = `
        <div class="card main-card mb-5 border-warning border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4"><h5 class="text-dark fw-bold text-warning"><i class="bi bi-sliders me-2"></i>Apertura de Caja</h5><button onclick="cargarDashboardFinanzas()" class="btn-close"></button></div>
                <form id="formApertura">
                    <div class="row g-4">
                        <div class="col-md-6"><label class="form-label fw-bold small text-muted">MONTO INICIAL</label><input type="number" step="0.01" id="montoApertura" class="form-control form-control-lg fw-bold" value="${valorActual}" required></div>
                        <div class="col-md-6"><label class="form-label fw-bold small text-muted">FECHA CORTE</label><input type="date" id="fechaApertura" class="form-control form-control-lg" value="${fechaActual}"></div>
                        <div class="col-12 text-end mt-4"><button type="submit" class="btn btn-warning fw-bold px-5">Guardar Ajuste</button></div>
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
                body: JSON.stringify({ fecha: document.getElementById('fechaApertura').value, tipo: 'ingreso', categoria: 'SALDO INICIAL', descripcion: 'Apertura / Ajuste', monto: parseFloat(document.getElementById('montoApertura').value), recibo_no: 'APERTURA' })
            });
            Swal.fire('Guardado', 'Saldo actualizado.', 'success');
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- INGRESO ---
function renderRegistrarIngreso() {
    const tal = talonariosIngreso.find(t => t.activo);
    const siguienteSugerido = tal ? tal.actual + 1 : '';
    
    let optsMiembros = '<option value="">-- Seleccionar --</option>';
    if (miembrosActuales && miembrosActuales.length > 0) {
        miembrosActuales.forEach(m => optsMiembros += `<option value="${m.nombre}">${m.nombre}</option>`);
    }
    
    let optsCultos = tiposCultos.map(c => `<option value="${c}">${c}</option>`).join('');

    const html = `
        <div class="card main-card mb-5 border-success border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4"><h5 class="text-dark fw-bold text-success"><i class="bi bi-plus-circle-fill me-2"></i>Nuevo Ingreso</h5><button onclick="cargarDashboardFinanzas()" class="btn-close"></button></div>
                <form id="formIngreso">
                    <div class="row g-3">
                        <div class="col-12 mb-3">
                            <div class="bg-light p-3 rounded-3 border d-flex align-items-center justify-content-between gap-3">
                                <div class="d-flex align-items-center">
                                    <div class="bg-white p-2 rounded-circle shadow-sm me-3 text-success"><i class="bi bi-receipt-cutoff fs-4"></i></div>
                                    <div><small class="text-uppercase fw-bold text-muted" style="font-size: 0.7rem;">Talonario</small><div class="fw-bold text-dark">${tal ? tal.nombre : '<span class="text-danger">Inactivo</span>'}</div></div>
                                </div>
                                <div style="width: 140px;">
                                    <label class="form-label small fw-bold mb-1 text-muted">RECIBO #</label>
                                    <input type="number" id="numRecibo" class="form-control fw-bold text-end border-success" placeholder="${tal ? siguienteSugerido : '-'}" ${!tal ? 'disabled' : ''}>
                                    <div id="reciboFeedback" class="validation-msg text-end"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">TIPO</label><select class="form-select" id="tipoIngreso" onchange="toggleCamposIngreso(this.value)"><option value="Ofrenda">Ofrenda</option><option value="Diezmo">Diezmo</option><option value="Actividad">Actividad</option><option value="Donacion">Donación</option></select></div>
                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">MONTO</label><div class="input-group"><span class="input-group-text fw-bold text-success bg-white">L.</span><input type="number" step="0.01" id="montoIngreso" class="form-control fw-bold fs-5 text-success border-start-0" required></div></div>
                        <div class="col-md-6" id="divCultos"><label class="form-label small fw-bold text-primary">CULTO</label><select class="form-select bg-primary bg-opacity-10 border-primary text-primary fw-bold" id="selectCulto"><option value="General">General</option>${optsCultos}</select></div>
                        <div class="col-md-6" id="divDonante" style="display:none;"><label class="form-label small fw-bold text-muted">DONANTE</label><div class="input-group"><select class="form-select" id="miembroIngreso">${optsMiembros}</select><button class="btn btn-outline-secondary" type="button" onclick="agregarMiembroRapido()"><i class="bi bi-person-plus-fill"></i></button></div></div>
                        <div class="col-12"><label class="form-label small fw-bold text-muted">NOTA</label><input type="text" id="detalleIngreso" class="form-control" placeholder="Detalle opcional..."></div>
                        <div class="col-12 text-end mt-4"><button type="submit" class="btn btn-success fw-bold px-5 py-2 shadow-sm rounded-pill" id="btnGuardarIngreso">Guardar Ingreso</button></div>
                    </div>
                </form>
            </div>
        </div>`;
    document.getElementById('vistaFinanzas').innerHTML = html;
    setupValidacionRecibo(tal, 'numRecibo', 'reciboFeedback', 'btnGuardarIngreso');
    toggleCamposIngreso('Ofrenda');

    document.getElementById('formIngreso').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nRecibo = parseInt(document.getElementById('numRecibo').value);
        if (tal && (isNaN(nRecibo) || nRecibo < tal.inicio || nRecibo > tal.fin || tal.usados.includes(nRecibo))) return Swal.fire('Error', 'Recibo inválido', 'error');

        const tipo = document.getElementById('tipoIngreso').value;
        const culto = document.getElementById('selectCulto').value;
        const miembro = document.getElementById('miembroIngreso').value;
        let desc = (tipo === 'Ofrenda' || tipo === 'Actividad') ? ((tipo === 'Actividad' ? 'Actividad: ' : '') + culto) : (tipo + (miembro ? ` - ${miembro}` : ''));
        if (document.getElementById('detalleIngreso').value) desc += ` (${document.getElementById('detalleIngreso').value})`;

        try {
            await authFetch('/api/finanzas/transacciones', { method: 'POST', body: JSON.stringify({ fecha: new Date().toISOString(), tipo: 'ingreso', categoria: tipo, descripcion: desc, monto: parseFloat(document.getElementById('montoIngreso').value), recibo_no: nRecibo ? String(nRecibo).padStart(6,'0') : 'S/N' }) });
            if (tal && nRecibo > tal.actual) await authFetch(`/api/finanzas/talonarios/${tal.id}`, { method: 'PUT', body: JSON.stringify({ actual: nRecibo, tipo: 'ingreso' }) });
            Swal.fire('Guardado', 'Ingreso registrado.', 'success');
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- GASTO ---
function renderRegistrarEgreso() {
    const tal = talonariosEgreso.find(t => t.activo);
    const siguienteSugerido = tal ? tal.actual + 1 : '';
    const cats = categoriasEgresos.length > 0 ? categoriasEgresos.map(c => c.nombre) : ['Varios'];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');

    const html = `
        <div class="card main-card mb-5 border-danger border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4"><h5 class="text-dark fw-bold text-danger"><i class="bi bi-dash-circle-fill me-2"></i>Nuevo Gasto</h5><button onclick="cargarDashboardFinanzas()" class="btn-close"></button></div>
                <form id="formEgreso">
                    <div class="row g-3">
                        <div class="col-12 mb-3">
                            <div class="bg-light p-3 rounded-3 border d-flex align-items-center justify-content-between gap-3">
                                <div class="d-flex align-items-center">
                                    <div class="bg-white p-2 rounded-circle shadow-sm me-3 text-danger"><i class="bi bi-file-earmark-text fs-4"></i></div>
                                    <div><small class="text-uppercase fw-bold text-muted" style="font-size: 0.7rem;">Voucher / Cheque</small><div class="fw-bold text-dark">${tal ? tal.nombre : '<span class="text-secondary">Sin Talonario</span>'}</div></div>
                                </div>
                                <div style="width: 140px;">
                                    <label class="form-label small fw-bold mb-1 text-muted">DOC #</label>
                                    <input type="number" id="numDoc" class="form-control fw-bold text-end border-danger" placeholder="${tal ? siguienteSugerido : 'S/N'}" ${!tal ? 'disabled' : ''}>
                                    <div id="docFeedback" class="validation-msg text-end"></div>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">CATEGORÍA</label><select class="form-select" id="catEgreso">${opts}<option value="OTRO">OTRO</option></select></div>
                        <div class="col-md-6"><label class="form-label small fw-bold text-muted">MONTO</label><div class="input-group"><span class="input-group-text fw-bold text-danger bg-white">L.</span><input type="number" step="0.01" id="montoEgreso" class="form-control fw-bold fs-5 text-danger border-start-0" required></div></div>
                        <div class="col-12"><label class="form-label small fw-bold text-muted">DESCRIPCIÓN</label><textarea id="descEgreso" class="form-control" rows="2" placeholder="Detalles de la compra..."></textarea></div>
                        <div class="col-12 text-end mt-4"><button type="submit" class="btn btn-danger fw-bold px-5 py-2 shadow-sm rounded-pill" id="btnGuardarEgreso">Registrar Gasto</button></div>
                    </div>
                </form>
            </div>
        </div>`;
    document.getElementById('vistaFinanzas').innerHTML = html;
    setupValidacionRecibo(tal, 'numDoc', 'docFeedback', 'btnGuardarEgreso');

    document.getElementById('formEgreso').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nDoc = parseInt(document.getElementById('numDoc').value);
        if (tal && (isNaN(nDoc) || nDoc < tal.inicio || nDoc > tal.fin || tal.usados.includes(nDoc))) return Swal.fire('Error', 'Doc inválido', 'error');
        try {
            await authFetch('/api/finanzas/transacciones', { method: 'POST', body: JSON.stringify({ fecha: new Date().toISOString(), tipo: 'egreso', categoria: document.getElementById('catEgreso').value, descripcion: document.getElementById('descEgreso').value, monto: parseFloat(document.getElementById('montoEgreso').value), recibo_no: nDoc ? String(nDoc).padStart(6,'0') : '-' }) });
            if (tal && nDoc > tal.actual) await authFetch(`/api/finanzas/talonarios/${tal.id}`, { method: 'PUT', body: JSON.stringify({ actual: nDoc, tipo: 'egreso' }) });
            Swal.fire('Guardado', 'Gasto registrado.', 'success');
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- LOGICA AUXILIAR Y VALIDACIONES ---

function toggleCamposIngreso(val) {
    const divCultos = document.getElementById('divCultos');
    const divDonante = document.getElementById('divDonante');
    if (val === 'Ofrenda' || val === 'Actividad') { 
        divCultos.style.display = 'block'; 
        divDonante.style.display = 'none'; 
    } else { 
        divCultos.style.display = 'none'; 
        document.getElementById('selectCulto').value = 'General'; 
        divDonante.style.display = 'block'; 
    }
}

function setupValidacionRecibo(tal, iId, fId, bId) {
    const inp = document.getElementById(iId); 
    const f = document.getElementById(fId); 
    const b = document.getElementById(bId);
    
    inp.addEventListener('input', () => {
        if (!tal) return;
        const v = parseInt(inp.value);
        inp.classList.remove('is-invalid', 'is-valid');
        b.disabled = false;
        
        if (isNaN(v)) { f.innerHTML = ''; return; }
        
        if (v < tal.inicio || v > tal.fin) { 
            inp.classList.add('is-invalid'); 
            f.innerHTML = 'Fuera rango'; 
            f.className = 'validation-msg text-danger text-end'; 
            b.disabled = true; 
        } else if (tal.usados.includes(v)) { 
            inp.classList.add('is-invalid'); 
            f.innerHTML = 'Ya usado'; 
            f.className = 'validation-msg text-danger text-end'; 
            b.disabled = true; 
        } else { 
            inp.classList.add('is-valid'); 
            f.innerHTML = 'Disponible'; 
            f.className = 'validation-msg text-success text-end'; 
        }
    });
}

// --- MODALES Y CRUD ---

async function nuevoTalonario(tipo) {
    const { value: f } = await Swal.fire({
        title: `Nuevo Talonario (${tipo})`,
        html: `
            <div class="container-fluid text-start">
                <div class="mb-3">
                    <label class="form-label fw-bold">Nombre</label>
                    <input id="sw-nom" class="form-control" placeholder="Ej: Serie A 2026">
                </div>
                <div class="row g-3">
                    <div class="col-6">
                        <label class="form-label fw-bold">Inicio</label>
                        <input id="sw-ini" type="number" class="form-control" placeholder="1">
                    </div>
                    <div class="col-6">
                        <label class="form-label fw-bold">Fin</label>
                        <input id="sw-fin" type="number" class="form-control" placeholder="100">
                    </div>
                </div>
            </div>
        `,
        focusConfirm: false,
        preConfirm: () => [document.getElementById('sw-nom').value, document.getElementById('sw-ini').value, document.getElementById('sw-fin').value]
    });

    if (f && f[0]) {
        try { 
            await authFetch('/api/finanzas/talonarios', { 
                method: 'POST', 
                body: JSON.stringify({ nombre: f[0], inicio: parseInt(f[1]), fin: parseInt(f[2]), actual: parseInt(f[1])-1, tipo: tipo }) 
            }); 
            // Recargar datos para que la config los detecte
            const data = await authFetch('/api/finanzas/datos');
            const mapped = data.talonarios.map(t => ({...t, inicio: t.rango_inicio, fin: t.rango_fin, usados: []}));
            talonariosIngreso = mapped.filter(t => t.tipo === 'ingreso');
            talonariosEgreso = mapped.filter(t => t.tipo === 'egreso');
            
            renderConfigFinanzas(); 
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }
}

async function editarTalonario(tipo, idx) {
    const lista = tipo === 'ingreso' ? talonariosIngreso : talonariosEgreso; 
    const t = lista[idx];
    
    const { value: f } = await Swal.fire({
        title: 'Editar Rango',
        html: `
            <div class="text-start">
                <label class="small fw-bold">Nombre</label><input id="e-nom" class="form-control mb-3" value="${t.nombre}">
                <div class="row g-2">
                    <div class="col-6"><label class="small fw-bold">Inicio</label><input id="e-ini" type="number" class="form-control" value="${t.inicio}"></div>
                    <div class="col-6"><label class="small fw-bold">Fin</label><input id="e-fin" type="number" class="form-control" value="${t.fin}"></div>
                </div>
                <div class="text-danger small mt-2 fw-bold">Cuidado: Cambiar esto no afecta recibos ya emitidos.</div>
            </div>`,
        focusConfirm: false,
        preConfirm: () => [document.getElementById('e-nom').value, document.getElementById('e-ini').value, document.getElementById('e-fin').value]
    });

    if (f && f[0]) { 
        try { 
            await authFetch(`/api/finanzas/talonarios/${t.id}`, { 
                method: 'PUT', 
                body: JSON.stringify({ nombre: f[0], inicio: parseInt(f[1]), fin: parseInt(f[2]) }) 
            }); 
            t.nombre = f[0]; 
            t.inicio = parseInt(f[1]); 
            t.fin = parseInt(f[2]); 
            renderConfigFinanzas(); 
        } catch (e) { Swal.fire('Error', e.message, 'error'); } 
    }
}

async function activarTalonario(id, tipo) { 
    await authFetch(`/api/finanzas/talonarios/${id}`, { method: 'PUT', body: JSON.stringify({ activo: true, tipo: tipo }) }); 
    cargarDashboardFinanzas(); // Recargar para actualizar todo
    setTimeout(renderConfigFinanzas, 300); // Volver a config
}

async function borrarTalonario(id) { 
    Swal.fire({ title: '¿Borrar?', text: "Se perderá el historial de este talonario.", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then(async (r) => { 
        if (r.isConfirmed) { 
            await authFetch(`/api/finanzas/talonarios/${id}`, { method: 'DELETE' }); 
            cargarDashboardFinanzas(); 
            setTimeout(renderConfigFinanzas, 300);
        } 
    }); 
}

async function agregarCategoria() { 
    const v = document.getElementById('newCat').value; 
    if (v) { 
        await authFetch('/api/finanzas/categorias', { method: 'POST', body: JSON.stringify({ nombre: v }) }); 
        const d = await authFetch('/api/finanzas/datos'); 
        categoriasEgresos = d.categorias; 
        renderConfigFinanzas(); 
    } 
}

async function borrarCategoria(id, el) { 
    el.closest('.cat-chip').classList.add('leaving'); 
    setTimeout(async () => { 
        await authFetch(`/api/finanzas/categorias/${id}`, { method: 'DELETE' }); 
        const d = await authFetch('/api/finanzas/datos'); 
        categoriasEgresos = d.categorias; 
        renderConfigFinanzas(); 
    }, 200); 
}

async function agregarMiembroRapido() {
    const { value: n } = await Swal.fire({ title: 'Nuevo Donante', input: 'text', showCancelButton: true });
    if (n) {
        try {
            // Guardar en la Base de Datos
            await authFetch('/api/miembros', {
                method: 'POST',
                body: JSON.stringify({
                    nombre: n,
                    fecha_nacimiento: '2000-01-01', // Valor por defecto
                    congregacion: 'General',
                    bautizado: false,
                    confirmado: false
                })
            });

            // Actualizar lista local
            miembrosActuales.push({ nombre: n });
            const s = document.getElementById('miembroIngreso');
            const o = document.createElement("option");
            o.text = n;
            o.value = n;
            o.selected = true;
            s.add(o);

            Swal.fire({ icon: 'success', title: 'Guardado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (e) {
            Swal.fire('Error', 'No se pudo guardar: ' + e.message, 'error');
        }
    }
}

function calcularSaldo() { 
    saldoActual = 0; 
    transacciones.forEach(t => { 
        if (t.tipo === 'ingreso') saldoActual += parseFloat(t.monto); 
        else saldoActual -= parseFloat(t.monto); 
    }); 
}

function generarFilasTabla() { 
    if (!transacciones.length) return '<tr><td colspan="5" class="text-center py-5 text-muted">Sin movimientos</td></tr>'; 
    return transacciones.map(t => { 
        const esIng = t.tipo === 'ingreso'; 
        let bdg = '-'; 
        if (t.recibo_no === 'APERTURA') bdg = '<span class="badge bg-warning text-dark border-0">APERTURA</span>'; 
        else if (t.recibo_no && t.recibo_no !== 'S/N' && t.recibo_no !== '-') bdg = `<span class="badge bg-light text-dark border fw-normal">#${t.recibo_no}</span>`; 
        
        return `<tr>
            <td data-label="Fecha"><small class="fw-bold text-muted">${formatoFecha(t.fecha)}</small></td>
            <td data-label="Recibo">${bdg}</td>
            <td data-label="Cat"><span class="badge rounded-pill ${esIng ? 'bg-success' : 'bg-danger'} bg-opacity-10 ${esIng ? 'text-success' : 'text-danger'} border border-opacity-25 fw-normal px-3">${t.categoria}</span></td>
            <td data-label="Desc"><span class="d-inline-block text-truncate" style="max-width:200px" title="${t.descripcion}">${t.descripcion}</span></td>
            <td data-label="Monto" class="text-end"><span class="fw-bold ${esIng ? 'text-success' : 'text-danger'} fs-6">${esIng ? '+' : '-'} ${formatoMoneda(t.monto)}</span></td>
        </tr>`; 
    }).join(''); 
}