// finance.js - Módulo Financiero v6 (Conectado a Neon DB 🟢)
console.log("Cargando Módulo Financiero v6 (Online)...");

// --- VARIABLES GLOBALES ---
let talonarios = [];
let categoriasEgresos = []; // Se llenará desde BD
let transacciones = [];
let saldoActual = 0;

// Constantes Locales (No cambian mucho)
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

// --- CARGA INICIAL (CONEXIÓN API) ---
async function cargarDashboardFinanzas() {
    const contenedor = document.getElementById('vistaFinanzas');
    
    // Mostrar Loading mientras carga
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted">Conectando con Neon DB...</p></div>';

    try {
        const response = await fetch('/api/finanzas/datos');
        const data = await response.json();

        // Asignamos datos de BD a variables globales
        transacciones = data.transacciones;
        categoriasEgresos = data.categorias;
        
        // Mapeamos los talonarios de BD al formato que usa la app
        talonarios = data.talonarios.map(t => ({
            id: t.id,
            nombre: t.nombre,
            inicio: t.rango_inicio,
            fin: t.rango_fin,
            actual: t.actual,
            activo: t.activo,
            usados: [] // Calcularemos esto abajo
        }));

        // Calcular 'usados' cruzando con transacciones
        talonarios.forEach(tal => {
            const recibosDeEsteTalonario = transacciones
                .filter(tx => tx.tipo === 'ingreso' && tx.recibo_no !== 'S/N' && tx.recibo_no !== 'APERTURA')
                .map(tx => parseInt(tx.recibo_no))
                .filter(num => num >= tal.inicio && num <= tal.fin); // Aseguramos que pertenece al rango
            tal.usados = recibosDeEsteTalonario;
        });

        calcularSaldo();
        renderizarVistaPrincipal(); // Dibujar HTML (El diseño bonito V5)

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<div class="alert alert-danger">Error cargando datos: ${error.message}</div>`;
    }
}

// --- RENDERIZADO VISUAL (Igual que V5) ---
function renderizarVistaPrincipal() {
    const contenedor = document.getElementById('vistaFinanzas');
    
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

// --- 1. APERTURA / AJUSTE (Conectado a API) ---
function renderAperturaCuenta() {
    const saldoExistente = transacciones.find(t => t.categoria === 'SALDO INICIAL');
    const valorActual = saldoExistente ? saldoExistente.monto : '';
    const fechaActual = saldoExistente ? new Date(saldoExistente.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    const html = `
        <div class="card main-card mb-5 border-warning border-start border-4">
            <div class="card-body p-4 p-lg-5">
                <div class="d-flex justify-content-between mb-4">
                    <h5 class="text-dark fw-bold"><i class="bi bi-sliders me-2 text-warning"></i>Apertura de Caja</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn-close"></button>
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

    document.getElementById('formApertura').addEventListener('submit', async (e) => {
        e.preventDefault();
        const monto = parseFloat(document.getElementById('montoApertura').value);
        const fecha = document.getElementById('fechaApertura').value;

        // Si ya existe, en teoría deberíamos hacer UPDATE, pero por simplicidad haremos un nuevo insert que aparecerá arriba
        // Ojo: Si quieres editar, necesitaríamos el ID. Por ahora, asumamos nuevo registro correctivo.
        
        const payload = {
            fecha: fecha,
            tipo: 'ingreso',
            categoria: 'SALDO INICIAL',
            descripcion: 'Apertura / Ajuste de Caja',
            monto: monto,
            recibo_no: 'APERTURA'
        };

        try {
            await fetch('/api/finanzas/transacciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            Swal.fire('Guardado', 'Saldo inicial registrado en Base de Datos.', 'success');
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- 2. INGRESO (Conectado a API) ---
function renderRegistrarIngreso() {
    const tal = talonarios.find(t => t.activo);
    const siguienteSugerido = tal ? tal.actual + 1 : '';
    
    // Opciones dinámicas
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
                            <div class="bg-light p-3 rounded-3 border d-flex align-items-center justify-content-between gap-3">
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
                                    <div id="reciboFeedback" class="small text-end mt-1"></div>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">TIPO DE INGRESO</label>
                            <select class="form-select" id="tipoIngreso" onchange="toggleCultos(this.value)">
                                <option value="Ofrenda">Ofrenda</option>
                                <option value="Diezmo">Diezmo</option>
                                <option value="Actividad">Actividad / Evento</option>
                                <option value="Donacion">Donación Especial</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">MONTO (L.)</label>
                            <div class="input-group">
                                <span class="input-group-text fw-bold text-success bg-white">L.</span>
                                <input type="number" step="0.01" id="montoIngreso" class="form-control fw-bold fs-5 text-success border-start-0" required>
                            </div>
                        </div>
                        <div class="col-md-6" id="divCultos">
                            <label class="form-label small fw-bold text-primary">CULTO / SERVICIO</label>
                            <select class="form-select bg-primary bg-opacity-10 border-primary text-primary fw-bold" id="selectCulto">
                                <option value="General">No Aplica / General</option>
                                ${optsCultos}
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">DONANTE</label>
                            <div class="input-group">
                                <select class="form-select" id="miembroIngreso">${optsMiembros}</select>
                                <button class="btn btn-outline-secondary" type="button" onclick="agregarMiembroRapido()"><i class="bi bi-person-plus-fill"></i></button>
                            </div>
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">NOTA</label>
                            <input type="text" id="detalleIngreso" class="form-control" placeholder="Ej: Venta de comida...">
                        </div>
                        <div class="col-12 text-end mt-4">
                            <button type="submit" class="btn btn-success fw-bold px-5 py-2 shadow-sm">Guardar</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;
    setupValidacionRecibo(tal);

    document.getElementById('formIngreso').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const inp = document.getElementById('numRecibo');
        const nRecibo = parseInt(inp.value);
        const monto = parseFloat(document.getElementById('montoIngreso').value);
        
        // Validación local antes de enviar
        if (tal) {
            if (!nRecibo) return Swal.fire('Error', 'Falta número recibo', 'error');
            if (nRecibo < tal.inicio || nRecibo > tal.fin) return Swal.fire('Error', 'Recibo fuera de rango', 'error');
            if (tal.usados.includes(nRecibo)) return Swal.fire('Error', 'Recibo ya usado', 'error');
        }

        const tipo = document.getElementById('tipoIngreso').value;
        const culto = document.getElementById('selectCulto').value;
        const miembro = document.getElementById('miembroIngreso').value;
        const detalle = document.getElementById('detalleIngreso').value;

        let desc = (tipo === 'Ofrenda') ? culto : tipo;
        if (miembro) desc += ` - ${miembro}`;
        if (detalle) desc += ` (${detalle})`;

        try {
            // 1. Guardar Transacción
            await fetch('/api/finanzas/transacciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: new Date().toISOString(),
                    tipo: 'ingreso',
                    categoria: tipo,
                    descripcion: desc,
                    monto: monto,
                    recibo_no: nRecibo ? String(nRecibo).padStart(6,'0') : 'S/N'
                })
            });

            // 2. Actualizar Talonario (si aplica)
            if (tal && nRecibo > tal.actual) {
                await fetch(`/api/finanzas/talonarios/${tal.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ actual: nRecibo })
                });
            }

            Swal.fire('Guardado', 'Ingreso registrado en BD', 'success');
            cargarDashboardFinanzas();

        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- 3. NUEVO GASTO (Conectado a API) ---
function renderRegistrarEgreso() {
    // Si no hay categorías en BD, usamos unas por defecto
    const cats = categoriasEgresos.length > 0 ? categoriasEgresos.map(c => c.nombre) : ['Mantenimiento', 'Servicios', 'Ayuda'];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');

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
                            <label class="form-label small fw-bold text-muted">CATEGORÍA</label>
                            <select class="form-select" id="catEgreso">${opts}<option value="OTRO">OTRO</option></select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold text-muted">MONTO (L.)</label>
                            <div class="input-group">
                                <span class="input-group-text fw-bold text-danger bg-white">L.</span>
                                <input type="number" step="0.01" id="montoEgreso" class="form-control fw-bold fs-5 text-danger border-start-0" required>
                            </div>
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold text-muted">DESCRIPCIÓN</label>
                            <textarea id="descEgreso" class="form-control" rows="2" placeholder="Detalles de compra..."></textarea>
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

    document.getElementById('formEgreso').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await fetch('/api/finanzas/transacciones', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fecha: new Date().toISOString(),
                    tipo: 'egreso',
                    categoria: document.getElementById('catEgreso').value,
                    descripcion: document.getElementById('descEgreso').value,
                    monto: parseFloat(document.getElementById('montoEgreso').value),
                    recibo_no: '-'
                })
            });
            Swal.fire('Guardado', 'Gasto registrado en BD', 'success');
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// --- 4. CONFIGURACIÓN (Conectado a API) ---
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
                            <small>Estado: ${t.activo ? '<span class="text-success fw-bold">Activo</span>' : '<span class="text-secondary">Inactivo</span>'}</small>
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
                        <p class="text-muted small mb-0">Datos maestros de finanzas.</p>
                    </div>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-light border shadow-sm"><i class="bi bi-arrow-return-left me-2"></i>Volver</button>
                </div>

                <div class="row g-5">
                    <div class="col-lg-7">
                        <div class="d-flex justify-content-between align-items-center mb-3">
                            <h6 class="fw-bold text-uppercase text-muted m-0 small">Talonarios</h6>
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
                                        ${c.nombre} 
                                        <i class="bi bi-x-circle-fill text-danger cursor-pointer" onclick="borrarCategoria(${c.id})" style="opacity:0.6"></i>
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

// --- LOGICA DB TALONARIOS ---
async function nuevoTalonario() {
    const { value: f } = await Swal.fire({
        title: 'Nuevo Talonario',
        html: `<input id="sw1" class="swal2-input" placeholder="Nombre"><input id="sw2" type="number" class="swal2-input" placeholder="Inicio"><input id="sw3" type="number" class="swal2-input" placeholder="Fin">`,
        focusConfirm: false,
        preConfirm: () => [document.getElementById('sw1').value, document.getElementById('sw2').value, document.getElementById('sw3').value]
    });

    if (f && f[0]) {
        try {
            await fetch('/api/finanzas/talonarios', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nombre: f[0], inicio: parseInt(f[1]), fin: parseInt(f[2]), actual: parseInt(f[1])-1 })
            });
            renderConfigFinanzas(); // Recarga solo la config (o mejor cargarDashboardFinanzas para recargar todo)
            cargarDashboardFinanzas();
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }
}

async function activarTalonario(idx) {
    const t = talonarios[idx];
    try {
        await fetch(`/api/finanzas/talonarios/${t.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activo: true })
        });
        cargarDashboardFinanzas();
    } catch (e) { Swal.fire('Error', e.message, 'error'); }
}

async function borrarTalonario(idx) {
    const t = talonarios[idx];
    Swal.fire({
        title: '¿Eliminar?',
        text: "Se borrará de la base de datos.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33'
    }).then(async (res) => {
        if (res.isConfirmed) {
            await fetch(`/api/finanzas/talonarios/${t.id}`, { method: 'DELETE' });
            cargarDashboardFinanzas();
        }
    });
}

// --- LOGICA DB CATEGORÍAS ---
async function agregarCategoria() {
    const v = document.getElementById('newCat').value;
    if(v) {
        await fetch('/api/finanzas/categorias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre: v })
        });
        cargarDashboardFinanzas();
    }
}
async function borrarCategoria(id) {
    await fetch(`/api/finanzas/categorias/${id}`, { method: 'DELETE' });
    cargarDashboardFinanzas();
}

// --- HELPERS VISUALES (Sin cambios grandes) ---
function toggleCultos(val) {
    const div = document.getElementById('divCultos');
    if (val === 'Ofrenda' || val === 'Actividad') { div.style.display = 'block'; } 
    else { div.style.display = 'none'; document.getElementById('selectCulto').value = 'General'; }
}

async function agregarMiembroRapido() {
    const { value: n } = await Swal.fire({ title: 'Nuevo Donante', input: 'text', showCancelButton: true });
    if (n && typeof miembrosActuales !== 'undefined') {
        miembrosActuales.push({ nombre: n }); // Ojo: Esto es temporal en RAM para el select, idealmente guardar en BD Miembros
        const sel = document.getElementById('miembroIngreso');
        const opt = document.createElement("option"); opt.text = n; opt.value = n; opt.selected = true;
        sel.add(opt);
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

function calcularSaldo() {
    saldoActual = 0;
    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') saldoActual += parseFloat(t.monto);
        else saldoActual -= parseFloat(t.monto);
    });
}

function generarFilasTabla() {
    if (transacciones.length === 0) return '<tr><td colspan="5" class="text-center py-5 text-muted">Sin movimientos registrados</td></tr>';
    
    return transacciones.map(t => {
        const esIngreso = t.tipo === 'ingreso';
        const color = esIngreso ? 'text-success' : 'text-danger';
        const signo = esIngreso ? '+' : '-';
        let reciboBadge = '-';
        if (t.recibo_no === 'APERTURA') reciboBadge = '<span class="badge bg-warning text-dark border-0">APERTURA</span>';
        else if (t.recibo_no && t.recibo_no !== 'S/N' && t.recibo_no !== '-') reciboBadge = `<span class="badge bg-light text-dark border fw-normal">#${t.recibo_no}</span>`;

        return `
            <tr>
                <td data-label="Fecha" class="text-nowrap"><small class="fw-bold text-muted">${formatoFecha(t.fecha)}</small></td>
                <td data-label="Recibo">${reciboBadge}</td>
                <td data-label="Categoría"><span class="badge rounded-pill ${esIngreso?'bg-success':'bg-danger'} bg-opacity-10 ${color} border border-opacity-25 fw-normal px-3">${t.categoria}</span></td>
                <td data-label="Descripción"><span class="d-inline-block text-truncate" style="max-width: 200px;" title="${t.descripcion}">${t.descripcion}</span></td>
                <td data-label="Monto" class="text-end"><span class="fw-bold ${color} fs-6">${signo} ${formatoMoneda(t.monto)}</span></td>
            </tr>
        `;
    }).join('');
}