// finance.js - Módulo Financiero v17 (UI Pro + CRUD Completo + Código Legible)
console.log("Cargando Módulo Financiero v17 Estabilizado...");

// ==========================================
// 1. VARIABLES GLOBALES Y CONFIGURACIÓN
// ==========================================
let talonariosIngreso = [];
let talonariosEgreso = [];
let categoriasEgresos = [];
let transacciones = [];
let miembrosFinanzas = []; 
let saldoActual = 0;
let ingresosMes = 0;
let egresosMes = 0;

const tiposCultos = [
    'Culto Dominical', 'Escuela Dominical', 'Culto de Oración', 
    'Culto de Enseñanza', 'Reunión de Jóvenes', 'Reunión de Damas', 'Vigilia'
];

// ==========================================
// 2. ESTILOS VISUALES (UI SYSTEM)
// ==========================================
try {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = `
        /* --- TARJETAS DASHBOARD --- */
        .pro-card {
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.05);
            border: 1px solid rgba(0,0,0,0.02);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .pro-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 8px 25px rgba(0,0,0,0.08);
        }
        
        /* --- ICONOS DE ESTADÍSTICAS --- */
        .stat-icon {
            width: 50px; height: 50px;
            border-radius: 12px;
            display: flex; align-items: center; justify-content: center;
            font-size: 1.6rem;
        }

        /* --- BADGES MODERNOS --- */
        .badge-soft-success { background-color: #d1e7dd; color: #0f5132; border: 1px solid #badbcc; }
        .badge-soft-danger { background-color: #f8d7da; color: #842029; border: 1px solid #f5c2c7; }
        .badge-soft-warning { background-color: #fff3cd; color: #664d03; border: 1px solid #ffecb5; }
        .badge-soft-info { background-color: #cff4fc; color: #055160; border: 1px solid #b6effb; }

        /* --- CHIPS DE CATEGORÍAS --- */
        .cat-chip {
            display: inline-flex; align-items: center;
            padding: 6px 14px;
            background: #f8f9fa; border: 1px solid #dee2e6;
            border-radius: 50px;
            font-size: 0.85rem; font-weight: 600; color: #495057;
            transition: all 0.2s;
        }
        .cat-chip:hover { background: #e9ecef; border-color: #ced4da; }
        .cat-chip.leaving { opacity: 0; transform: scale(0.8); }

        /* --- TABLA PROFESIONAL --- */
        .table-pro thead th {
            background-color: #f8f9fa;
            text-transform: uppercase;
            font-size: 0.75rem; font-weight: 700; color: #6c757d;
            letter-spacing: 0.5px;
            padding: 14px 10px;
            border-bottom: 2px solid #e9ecef;
        }
        .table-pro tbody td {
            padding: 12px 10px;
            vertical-align: middle;
            border-bottom: 1px solid #f1f3f5;
            color: #343a40; font-size: 0.9rem;
        }
        .table-pro tbody tr:hover { background-color: #f8f9fa; }

        /* --- BOTONES ACCIÓN --- */
        .btn-action {
            width: 34px; height: 34px;
            padding: 0;
            border-radius: 8px;
            display: inline-flex; align-items: center; justify-content: center;
            transition: background 0.2s;
            border: none; background: transparent;
        }
        .btn-action:hover { background-color: #e9ecef; }
        .btn-action.edit:hover { color: #0d6efd; background-color: #cfe2ff; }
        .btn-action.delete:hover { color: #dc3545; background-color: #f8d7da; }

        /* --- VALIDACIONES --- */
        .form-control.is-invalid { border-color: #dc3545; background-image: none; }
        .form-control.is-valid { border-color: #198754; background-image: none; }
        .validation-msg { font-size: 0.75rem; font-weight: 700; margin-top: 4px; display: block; }
    `;
    document.head.appendChild(styleSheet);
} catch (e) { console.error("Error aplicando estilos:", e); }

// ==========================================
// 3. UTILIDADES Y FORMATO
// ==========================================
const formatoMoneda = (monto) => new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(monto);

const formatoFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    const userTimezoneOffset = fecha.getTimezoneOffset() * 60000;
    const fechaCorregida = new Date(fecha.getTime() + userTimezoneOffset);
    return fechaCorregida.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
};

// ==========================================
// 4. COMUNICACIÓN CON SERVIDOR
// ==========================================
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

// ==========================================
// 5. CARGA DE DATOS Y MÉTRICAS
// ==========================================
async function cargarDashboardFinanzas() {
    const contenedor = document.getElementById('vistaFinanzas');
    if (!contenedor) return;
    
    contenedor.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary"></div><p class="mt-2 text-muted fw-bold">Sincronizando Finanzas...</p></div>';

    try {
        const [dataFinanzas, dataMiembros] = await Promise.all([
            authFetch('/api/finanzas/datos'),
            authFetch('/api/miembros')
        ]);

        transacciones = dataFinanzas.transacciones;
        categoriasEgresos = dataFinanzas.categorias;
        miembrosFinanzas = dataMiembros;

        // Procesar Talonarios y sus usos
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

        calcularMetricas();
        renderizarVistaPrincipal();

    } catch (error) {
        console.error(error);
        contenedor.innerHTML = `<div class="alert alert-danger m-4 shadow-sm border-0"><strong>Error:</strong> ${error.message}</div>`;
    }
}

function calcularMetricas() {
    saldoActual = 0;
    ingresosMes = 0;
    egresosMes = 0;

    const hoy = new Date();
    const mesActual = hoy.getMonth();
    const anioActual = hoy.getFullYear();

    transacciones.forEach(t => {
        const monto = parseFloat(t.monto);
        const fechaT = new Date(t.fecha);
        const esMesActual = (fechaT.getMonth() === mesActual && fechaT.getFullYear() === anioActual);

        if (t.tipo === 'ingreso') {
            saldoActual += monto;
            if(esMesActual) ingresosMes += monto;
        } else {
            saldoActual -= monto;
            if(esMesActual) egresosMes += monto;
        }
    });
}

// ==========================================
// 6. RENDERIZADO DEL DASHBOARD (VISTA PRINCIPAL)
// ==========================================
function renderizarVistaPrincipal() {
    const contenedor = document.getElementById('vistaFinanzas');
    
    let html = `
    <div class="container-fluid px-0">
        <div class="row g-4 mb-4">
            <div class="col-md-4">
                <div class="pro-card h-100 p-4 d-flex align-items-center justify-content-between border-start border-4 border-primary">
                    <div>
                        <small class="text-uppercase text-muted fw-bold" style="font-size:0.75rem;">Saldo Disponible</small>
                        <h2 class="fw-bold text-dark mb-0">${formatoMoneda(saldoActual)}</h2>
                    </div>
                    <div class="stat-icon bg-primary bg-opacity-10 text-primary">
                        <i class="bi bi-wallet2"></i>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="pro-card h-100 p-4 d-flex align-items-center justify-content-between border-start border-4 border-success">
                    <div>
                        <small class="text-uppercase text-muted fw-bold" style="font-size:0.75rem;">Ingresos (Mes)</small>
                        <h3 class="fw-bold text-success mb-0">+${formatoMoneda(ingresosMes)}</h3>
                    </div>
                    <div class="stat-icon bg-success bg-opacity-10 text-success">
                        <i class="bi bi-graph-up-arrow"></i>
                    </div>
                </div>
            </div>
            <div class="col-md-4">
                <div class="pro-card h-100 p-4 d-flex align-items-center justify-content-between border-start border-4 border-danger">
                    <div>
                        <small class="text-uppercase text-muted fw-bold" style="font-size:0.75rem;">Gastos (Mes)</small>
                        <h3 class="fw-bold text-danger mb-0">-${formatoMoneda(egresosMes)}</h3>
                    </div>
                    <div class="stat-icon bg-danger bg-opacity-10 text-danger">
                        <i class="bi bi-graph-down-arrow"></i>
                    </div>
                </div>
            </div>
        </div>

        <div class="pro-card p-4">
            <div class="d-flex flex-wrap justify-content-between align-items-center mb-4 gap-3">
                <h5 class="fw-bold text-dark m-0"><i class="bi bi-list-columns-reverse me-2"></i>Movimientos</h5>
                
                <div class="d-flex gap-2">
                    <button onclick="renderAperturaCuenta()" class="btn btn-sm btn-outline-warning fw-bold px-3">
                        <i class="bi bi-sliders me-1"></i>Ajuste
                    </button>
                    <button onclick="renderRegistrarIngreso()" class="btn btn-sm btn-success fw-bold px-3 shadow-sm">
                        <i class="bi bi-plus-lg me-1"></i>Ingreso
                    </button>
                    <button onclick="renderRegistrarEgreso()" class="btn btn-sm btn-danger fw-bold px-3 shadow-sm">
                        <i class="bi bi-dash-lg me-1"></i>Gasto
                    </button>
                    <button onclick="renderConfigFinanzas()" class="btn btn-sm btn-dark px-3 shadow-sm" title="Configuración">
                        <i class="bi bi-gear-fill"></i>
                    </button>
                </div>
            </div>

            <div class="table-responsive">
                <table class="table table-pro w-100">
                    <thead>
                        <tr>
                            <th style="width: 12%;">FECHA</th>
                            <th style="width: 10%;">REC/DOC</th>
                            <th style="width: 15%;">CATEGORÍA</th>
                            <th style="width: 25%;">DESCRIPCIÓN</th>
                            <th style="width: 10%; text-align: center;">COMULG.</th>
                            <th style="width: 15%; text-align: right;">MONTO</th>
                            <th style="width: 13%; text-align: center;">ACCIONES</th>
                        </tr>
                    </thead>
                    <tbody>${generarFilasTabla()}</tbody>
                </table>
            </div>
        </div>
    </div>`;
    contenedor.innerHTML = html;
}

function generarFilasTabla() {
    if (!transacciones.length) return '<tr><td colspan="7" class="text-center py-5 text-muted"><i>No hay movimientos registrados</i></td></tr>';
    
    return transacciones.map((t, index) => {
        const esIng = t.tipo === 'ingreso';
        const colorMonto = esIng ? 'text-success' : 'text-danger';
        const signo = esIng ? '+' : '-';
        
        // Badge de Recibo
        let reciboHtml = '<span class="text-muted small">-</span>';
        if (t.recibo_no === 'APERTURA') reciboHtml = '<span class="badge badge-soft-warning text-dark">INICIO</span>';
        else if (t.recibo_no && t.recibo_no !== 'S/N' && t.recibo_no !== '-') reciboHtml = `<span class="fw-bold text-dark small">#${t.recibo_no}</span>`;

        // Badge de Categoría
        const catBadge = esIng ? 'badge-soft-success' : 'badge-soft-danger';
        
        // Comulgantes
        const comulgantesHtml = (t.comulgantes && t.comulgantes > 0) 
            ? `<span class="badge badge-soft-info text-dark"><i class="bi bi-person-fill me-1"></i>${t.comulgantes}</span>` 
            : '<span class="text-muted small">-</span>';

        return `
        <tr>
            <td class="text-nowrap"><span class="fw-bold text-secondary" style="font-size:0.85rem">${formatoFecha(t.fecha)}</span></td>
            <td>${reciboHtml}</td>
            <td><span class="badge ${catBadge}">${t.categoria}</span></td>
            <td><span class="d-inline-block text-truncate text-muted" style="max-width:220px;" title="${t.descripcion}">${t.descripcion}</span></td>
            <td class="text-center">${comulgantesHtml}</td>
            <td class="text-end fw-bold ${colorMonto}">${signo} ${formatoMoneda(t.monto)}</td>
            <td class="text-center">
                <button onclick="editarTransaccion(${index})" class="btn-action edit" title="Editar"><i class="bi bi-pencil-square"></i></button>
                <button onclick="eliminarTransaccion(${t.id})" class="btn-action delete" title="Eliminar"><i class="bi bi-trash3"></i></button>
            </td>
        </tr>`;
    }).join('');
}

// ==========================================
// 7. FUNCIONES CRUD (EDITAR / ELIMINAR)
// ==========================================
async function eliminarTransaccion(id) {
    const result = await Swal.fire({
        title: '¿Eliminar registro?',
        text: "Esta acción afectará el saldo y los totales. ¿Estás seguro?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, eliminar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            await authFetch(`/api/finanzas/transacciones/${id}`, { method: 'DELETE' });
            
            Swal.fire({
                title: 'Eliminado',
                icon: 'success',
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 1500
            });
            
            cargarDashboardFinanzas();
        } catch (e) {
            Swal.fire('Error', e.message, 'error');
        }
    }
}

async function editarTransaccion(index) {
    const t = transacciones[index];
    const fechaISO = new Date(t.fecha).toISOString().split('T')[0];

    const { value: formValues } = await Swal.fire({
        title: 'Editar Transacción',
        html: `
            <div class="text-start fs-6">
                <div class="row g-2 mb-3">
                    <div class="col-6">
                        <label class="form-label small fw-bold text-muted">FECHA</label>
                        <input id="sw-fecha" type="date" class="form-control" value="${fechaISO}">
                    </div>
                    <div class="col-6">
                        <label class="form-label small fw-bold text-muted">DOC / RECIBO</label>
                        <input id="sw-recibo" type="text" class="form-control" value="${t.recibo_no}">
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted">CATEGORÍA</label>
                    <input id="sw-cat" type="text" class="form-control" value="${t.categoria}">
                </div>
                
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted">DESCRIPCIÓN</label>
                    <textarea id="sw-desc" class="form-control" rows="2">${t.descripcion}</textarea>
                </div>
                
                <div class="row g-2">
                    <div class="col-6">
                        <label class="form-label small fw-bold text-muted">MONTO</label>
                        <input id="sw-monto" type="number" step="0.01" class="form-control fw-bold" value="${t.monto}">
                    </div>
                    <div class="col-6">
                        <label class="form-label small fw-bold text-info">COMULGANTES</label>
                        <input id="sw-comu" type="number" class="form-control" value="${t.comulgantes || 0}">
                    </div>
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        focusConfirm: false,
        preConfirm: () => {
            return {
                fecha: document.getElementById('sw-fecha').value,
                recibo_no: document.getElementById('sw-recibo').value,
                categoria: document.getElementById('sw-cat').value,
                descripcion: document.getElementById('sw-desc').value,
                monto: document.getElementById('sw-monto').value,
                comulgantes: document.getElementById('sw-comu').value
            }
        }
    });

    if (formValues) {
        try {
            await authFetch(`/api/finanzas/transacciones/${t.id}`, {
                method: 'PUT',
                body: JSON.stringify(formValues)
            });
            Swal.fire({ icon: 'success', title: 'Actualizado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            cargarDashboardFinanzas();
        } catch (error) {
            Swal.fire('Error', error.message, 'error');
        }
    }
}

// ==========================================
// 8. FORMULARIOS (INGRESO / EGRESO)
// ==========================================

function renderRegistrarIngreso() {
    const tal = talonariosIngreso.find(t => t.activo);
    const siguienteSugerido = tal ? tal.actual + 1 : '';
    
    // Generar opciones de miembros
    let optsMiembros = '<option value="">-- Seleccionar --</option>';
    if (miembrosFinanzas && miembrosFinanzas.length > 0) {
        miembrosFinanzas.forEach(m => optsMiembros += `<option value="${m.nombre}">${m.nombre}</option>`);
    }
    
    // Renderizar Formulario
    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
            <div class="pro-card p-5 border-top border-4 border-success">
                <div class="d-flex justify-content-between mb-4">
                    <h5 class="fw-bold text-success"><i class="bi bi-plus-circle-fill me-2"></i>Nuevo Ingreso</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn-close"></button>
                </div>
                
                <form id="formIngreso">
                    <div class="bg-light p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center border">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-receipt-cutoff fs-3 text-success me-3"></i>
                            <div>
                                <small class="text-muted fw-bold" style="font-size:0.7rem;">TALONARIO ACTIVO</small>
                                <div class="fw-bold text-dark">${tal ? tal.nombre : '<span class="text-danger">Ninguno</span>'}</div>
                            </div>
                        </div>
                        <div style="width: 120px;">
                            <label class="form-label small fw-bold mb-1">RECIBO #</label>
                            <input type="number" id="numRecibo" class="form-control form-control-sm fw-bold text-end border-success" 
                                placeholder="${siguienteSugerido}" ${!tal ? 'disabled' : ''}>
                            <div id="reciboFeedback" class="validation-msg text-end"></div>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">TIPO</label>
                            <select class="form-select" id="tipoIngreso" onchange="toggleCamposIngreso(this.value)">
                                <option value="Ofrenda">Ofrenda</option>
                                <option value="Diezmo">Diezmo</option>
                                <option value="Actividad">Actividad</option>
                                <option value="Donacion">Donación</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">MONTO</label>
                            <div class="input-group">
                                <span class="input-group-text bg-white text-success fw-bold">L.</span>
                                <input type="number" step="0.01" id="montoIngreso" class="form-control fw-bold text-success" required>
                            </div>
                        </div>
                    </div>

                    <div id="divCultos" class="row g-2 mb-3">
                        <div class="col-8">
                            <label class="form-label small fw-bold text-primary">CULTO</label>
                            <select class="form-select text-primary fw-bold" id="selectCulto">
                                <option value="General">General</option>
                                ${tiposCultos.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div class="col-4">
                            <label class="form-label small fw-bold text-muted" title="Personas que comulgaron">COMULG.</label>
                            <input type="number" id="cantComulgantes" class="form-control text-center" placeholder="0">
                        </div>
                    </div>

                    <div id="divDonante" class="mb-3" style="display:none;">
                        <label class="form-label small fw-bold text-muted">DONANTE</label>
                        <div class="input-group">
                            <select class="form-select" id="miembroIngreso">${optsMiembros}</select>
                            <button class="btn btn-outline-secondary" type="button" onclick="agregarMiembroRapido()">
                                <i class="bi bi-person-plus-fill"></i>
                            </button>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="form-label small fw-bold text-muted">NOTA ADICIONAL</label>
                        <input type="text" id="detalleIngreso" class="form-control" placeholder="Opcional...">
                    </div>

                    <div class="d-grid">
                        <button type="submit" id="btnGuardarIngreso" class="btn btn-success fw-bold py-2 shadow-sm">
                            Guardar Ingreso
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>`;
    
    // Inicializar lógica visual
    toggleCamposIngreso('Ofrenda');
    setupValidacionRecibo(tal, 'numRecibo', 'reciboFeedback', 'btnGuardarIngreso');

    // Manejar Submit
    document.getElementById('formIngreso').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nRecibo = parseInt(document.getElementById('numRecibo').value);
        
        // Validación final antes de enviar
        if (tal && (isNaN(nRecibo) || nRecibo < tal.inicio || nRecibo > tal.fin || tal.usados.includes(nRecibo))) {
            return Swal.fire('Error', 'El número de recibo no es válido o ya fue usado.', 'error');
        }

        const tipo = document.getElementById('tipoIngreso').value;
        const culto = document.getElementById('selectCulto').value;
        const miembro = document.getElementById('miembroIngreso').value;
        const comulgantes = parseInt(document.getElementById('cantComulgantes').value) || 0;

        let desc = (tipo === 'Ofrenda' || tipo === 'Actividad') 
            ? ((tipo === 'Actividad' ? 'Actividad: ' : '') + culto) 
            : (tipo + (miembro ? ` - ${miembro}` : ''));
            
        if (document.getElementById('detalleIngreso').value) {
            desc += ` (${document.getElementById('detalleIngreso').value})`;
        }

        try {
            await authFetch('/api/finanzas/transacciones', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    fecha: new Date().toISOString(), 
                    tipo: 'ingreso', 
                    categoria: tipo, 
                    descripcion: desc, 
                    monto: parseFloat(document.getElementById('montoIngreso').value), 
                    recibo_no: nRecibo ? String(nRecibo).padStart(6,'0') : 'S/N',
                    comulgantes: comulgantes 
                }) 
            });
            
            if (tal && nRecibo > tal.actual) {
                await authFetch(`/api/finanzas/talonarios/${tal.id}`, { 
                    method: 'PUT', 
                    body: JSON.stringify({ actual: nRecibo, tipo: 'ingreso' }) 
                });
            }
            
            Swal.fire({ title: 'Guardado', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            cargarDashboardFinanzas();
            
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

function renderRegistrarEgreso() {
    const tal = talonariosEgreso.find(t => t.activo);
    const siguienteSugerido = tal ? tal.actual + 1 : '';
    const cats = categoriasEgresos.length > 0 ? categoriasEgresos.map(c => c.nombre) : ['Varios'];
    let opts = cats.map(c => `<option value="${c}">${c}</option>`).join('');

    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="row justify-content-center">
        <div class="col-md-8 col-lg-6">
            <div class="pro-card p-5 border-top border-4 border-danger">
                <div class="d-flex justify-content-between mb-4">
                    <h5 class="fw-bold text-danger"><i class="bi bi-dash-circle-fill me-2"></i>Nuevo Gasto</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn-close"></button>
                </div>
                
                <form id="formEgreso">
                    <div class="bg-light p-3 rounded-3 mb-4 d-flex justify-content-between align-items-center border">
                        <div class="d-flex align-items-center">
                            <i class="bi bi-file-earmark-spreadsheet-fill fs-3 text-danger me-3"></i>
                            <div>
                                <small class="text-muted fw-bold" style="font-size:0.7rem;">CHEQUERA / VOUCHER</small>
                                <div class="fw-bold text-dark">${tal ? tal.nombre : '<span class="text-secondary">Sin Talonario</span>'}</div>
                            </div>
                        </div>
                        <div style="width: 120px;">
                            <label class="form-label small fw-bold mb-1">DOC #</label>
                            <input type="number" id="numDoc" class="form-control form-control-sm fw-bold text-end border-danger" 
                                placeholder="${siguienteSugerido}" ${!tal ? 'disabled' : ''}>
                            <div id="docFeedback" class="validation-msg text-end"></div>
                        </div>
                    </div>

                    <div class="row g-3 mb-3">
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">CATEGORÍA</label>
                            <select class="form-select" id="catEgreso">
                                ${opts}
                                <option value="OTRO">OTRO</option>
                            </select>
                        </div>
                        <div class="col-6">
                            <label class="form-label small fw-bold text-muted">MONTO</label>
                            <div class="input-group">
                                <span class="input-group-text bg-white text-danger fw-bold">L.</span>
                                <input type="number" step="0.01" id="montoEgreso" class="form-control fw-bold text-danger" required>
                            </div>
                        </div>
                    </div>

                    <div class="mb-4">
                        <label class="form-label small fw-bold text-muted">DESCRIPCIÓN</label>
                        <textarea id="descEgreso" class="form-control" rows="2" placeholder="Detalles de la compra..."></textarea>
                    </div>

                    <div class="d-grid">
                        <button type="submit" id="btnGuardarEgreso" class="btn btn-danger fw-bold py-2 shadow-sm">
                            Registrar Gasto
                        </button>
                    </div>
                </form>
            </div>
        </div>
    </div>`;

    setupValidacionRecibo(tal, 'numDoc', 'docFeedback', 'btnGuardarEgreso');

    document.getElementById('formEgreso').addEventListener('submit', async (e) => {
        e.preventDefault();
        const nDoc = parseInt(document.getElementById('numDoc').value);
        
        if (tal && (isNaN(nDoc) || nDoc < tal.inicio || nDoc > tal.fin || tal.usados.includes(nDoc))) {
            return Swal.fire('Error', 'Número de documento inválido.', 'error');
        }

        try {
            await authFetch('/api/finanzas/transacciones', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    fecha: new Date().toISOString(), 
                    tipo: 'egreso', 
                    categoria: document.getElementById('catEgreso').value, 
                    descripcion: document.getElementById('descEgreso').value, 
                    monto: parseFloat(document.getElementById('montoEgreso').value), 
                    recibo_no: nDoc ? String(nDoc).padStart(6,'0') : '-' 
                }) 
            });
            
            if (tal && nDoc > tal.actual) {
                await authFetch(`/api/finanzas/talonarios/${tal.id}`, { 
                    method: 'PUT', 
                    body: JSON.stringify({ actual: nDoc, tipo: 'egreso' }) 
                });
            }
            
            Swal.fire({ title: 'Guardado', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// ==========================================
// 9. CONFIGURACIÓN (TALONARIOS Y CATEGORÍAS)
// ==========================================
function renderConfigFinanzas() {
    const cardTalonario = (t, idx, type) => {
        const borderClass = type === 'ingreso' ? 'border-success' : 'border-danger';
        const badge = t.activo 
            ? '<span class="badge badge-soft-success">Activo</span>' 
            : '<span class="badge badge-soft-warning">Inactivo</span>';

        return `
        <div class="col-md-6 col-lg-12 col-xl-6">
            <div class="pro-card p-3 border-start border-4 ${borderClass} h-100">
                <div class="d-flex justify-content-between mb-2">
                    <span class="fw-bold text-dark">${t.nombre}</span>
                    ${badge}
                </div>
                <div class="d-flex justify-content-between align-items-end">
                    <div class="small text-muted">
                        Rango: ${t.inicio} - ${t.fin}<br>
                        <strong class="text-dark fs-5">#${t.actual}</strong>
                    </div>
                    <div class="btn-group">
                        ${!t.activo ? `<button onclick="activarTalonario(${t.id}, '${type}')" class="btn btn-sm btn-light border" title="Activar"><i class="bi bi-power"></i></button>` : ''}
                        <button onclick="editarTalonario('${type}', ${idx})" class="btn btn-sm btn-light border" title="Editar"><i class="bi bi-pencil"></i></button>
                        <button onclick="borrarTalonario(${t.id})" class="btn btn-sm btn-light border text-danger" title="Borrar"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>`;
    };

    const listaIng = talonariosIngreso.map((t, i) => cardTalonario(t, i, 'ingreso')).join('') || '<div class="col-12 text-center py-4 text-muted border rounded bg-light">No hay talonarios</div>';
    const listaEgr = talonariosEgreso.map((t, i) => cardTalonario(t, i, 'egreso')).join('') || '<div class="col-12 text-center py-4 text-muted border rounded bg-light">No hay talonarios</div>';

    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="pro-card p-4">
        <div class="d-flex justify-content-between align-items-center mb-4">
            <h5 class="fw-bold text-dark m-0">Configuración</h5>
            <button onclick="cargarDashboardFinanzas()" class="btn btn-light border">Volver</button>
        </div>

        <div class="row g-5">
            <div class="col-lg-7">
                <ul class="nav nav-pills mb-3" id="pills-tab">
                    <li class="nav-item me-2">
                        <button class="nav-link active py-1 px-3 small" data-bs-toggle="pill" data-bs-target="#tab-ingresos">Ingresos</button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link py-1 px-3 small" data-bs-toggle="pill" data-bs-target="#tab-egresos">Egresos</button>
                    </li>
                </ul>
                
                <div class="tab-content">
                    <div class="tab-pane fade show active" id="tab-ingresos">
                        <div class="d-flex justify-content-end mb-2">
                            <button onclick="nuevoTalonario('ingreso')" class="btn btn-sm btn-success fw-bold">+ Nuevo</button>
                        </div>
                        <div class="row g-3">${listaIng}</div>
                    </div>
                    <div class="tab-pane fade" id="tab-egresos">
                        <div class="d-flex justify-content-end mb-2">
                            <button onclick="nuevoTalonario('egreso')" class="btn btn-sm btn-danger fw-bold">+ Nuevo</button>
                        </div>
                        <div class="row g-3">${listaEgr}</div>
                    </div>
                </div>
            </div>

            <div class="col-lg-5 border-start">
                <h6 class="fw-bold mb-3 ms-2 text-muted">Categorías de Gastos</h6>
                <div class="input-group mb-3 px-2">
                    <input type="text" id="newCat" class="form-control form-control-sm" placeholder="Nueva categoría...">
                    <button onclick="agregarCategoria()" class="btn btn-dark btn-sm shadow-sm"><i class="bi bi-plus-lg"></i></button>
                </div>
                <div class="px-2 d-flex flex-wrap gap-2">
                    ${categoriasEgresos.map(c => `
                        <span class="cat-chip">
                            ${c.nombre} 
                            <i class="bi bi-x text-danger cursor-pointer ms-2" onclick="borrarCategoria(${c.id}, this)"></i>
                        </span>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>`;
}

// ==========================================
// 10. LÓGICA DE APOYO (HELPERS)
// ==========================================

function toggleCamposIngreso(val) {
    const divCultos = document.getElementById('divCultos');
    const divDonante = document.getElementById('divDonante');
    if (val === 'Ofrenda' || val === 'Actividad') { 
        divCultos.style.display = 'flex'; 
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
            f.innerHTML = '<span class="text-success"><i class="bi bi-check"></i> Disponible</span>'; 
            f.className = 'validation-msg text-end'; 
        }
    });
}

function renderAperturaCuenta() {
    const saldoExistente = transacciones.find(t => t.categoria === 'SALDO INICIAL');
    const valorActual = saldoExistente ? saldoExistente.monto : '';
    const fechaActual = saldoExistente ? new Date(saldoExistente.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

    document.getElementById('vistaFinanzas').innerHTML = `
    <div class="row justify-content-center">
        <div class="col-md-6">
            <div class="pro-card p-5 border-top border-4 border-warning">
                <h5 class="fw-bold mb-4">Apertura / Ajuste de Caja</h5>
                <form id="formApertura">
                    <div class="mb-3">
                        <label class="form-label fw-bold small">MONTO INICIAL</label>
                        <input type="number" step="0.01" id="montoApertura" class="form-control fw-bold" value="${valorActual}" required>
                    </div>
                    <div class="mb-4">
                        <label class="form-label fw-bold small">FECHA CORTE</label>
                        <input type="date" id="fechaApertura" class="form-control" value="${fechaActual}">
                    </div>
                    <div class="d-flex gap-2">
                        <button type="button" class="btn btn-light border w-50" onclick="cargarDashboardFinanzas()">Cancelar</button>
                        <button type="submit" class="btn btn-warning w-50 fw-bold">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    </div>`;

    document.getElementById('formApertura').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await authFetch('/api/finanzas/transacciones', {
                method: 'POST',
                body: JSON.stringify({ 
                    fecha: document.getElementById('fechaApertura').value, 
                    tipo: 'ingreso', 
                    categoria: 'SALDO INICIAL', 
                    descripcion: 'Apertura / Ajuste', 
                    monto: parseFloat(document.getElementById('montoApertura').value), 
                    recibo_no: 'APERTURA' 
                })
            });
            Swal.fire({ title: 'Guardado', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            cargarDashboardFinanzas();
        } catch (err) { Swal.fire('Error', err.message, 'error'); }
    });
}

// ==========================================
// 11. GESTIÓN TALONARIOS Y CATEGORÍAS (CRUD MEJORADO)
// ==========================================

async function nuevoTalonario(tipo) {
    const titulo = tipo === 'ingreso' ? 'Ingresos' : 'Egresos';
    const color = tipo === 'ingreso' ? '#198754' : '#dc3545'; // Verde o Rojo

    const { value: f } = await Swal.fire({
        title: `Nuevo Talonario (${titulo})`,
        // Usamos HTML con clases de Bootstrap para que se vea ordenado
        html: `
            <div class="text-start fs-6">
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted">NOMBRE DE LA SERIE</label>
                    <input id="sw-nom" class="form-control" placeholder="Ej: Serie A - 2026">
                </div>
                <div class="row g-3">
                    <div class="col-6">
                        <label class="form-label small fw-bold text-muted">INICIO</label>
                        <input id="sw-ini" type="number" class="form-control fw-bold" placeholder="1">
                    </div>
                    <div class="col-6">
                        <label class="form-label small fw-bold text-muted">FIN</label>
                        <input id="sw-fin" type="number" class="form-control fw-bold" placeholder="100">
                    </div>
                </div>
                <div class="mt-3 p-2 bg-light border rounded small text-muted">
                    <i class="bi bi-info-circle me-1"></i> El conteo iniciará automáticamente desde el valor "Inicio".
                </div>
            </div>
        `,
        showCancelButton: true,
        confirmButtonColor: color,
        confirmButtonText: 'Crear Talonario',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        preConfirm: () => {
            const nom = document.getElementById('sw-nom').value;
            const ini = document.getElementById('sw-ini').value;
            const fin = document.getElementById('sw-fin').value;
            if (!nom || !ini || !fin) {
                Swal.showValidationMessage('Por favor completa todos los campos');
                return false;
            }
            return [nom, ini, fin];
        }
    });

    if (f && f[0]) {
        try { 
            await authFetch('/api/finanzas/talonarios', { 
                method: 'POST', 
                body: JSON.stringify({ 
                    nombre: f[0], 
                    inicio: parseInt(f[1]), 
                    fin: parseInt(f[2]), 
                    actual: parseInt(f[1])-1, // El actual empieza uno antes del inicio
                    tipo: tipo 
                }) 
            }); 
            
            // Recarga completa de datos
            const d = await authFetch('/api/finanzas/datos');
            const mapped = d.talonarios.map(t => ({...t, inicio: t.rango_inicio, fin: t.rango_fin, usados: []}));
            talonariosIngreso = mapped.filter(t => t.tipo === 'ingreso');
            talonariosEgreso = mapped.filter(t => t.tipo === 'egreso');
            
            renderConfigFinanzas(); 
            Swal.fire({ icon: 'success', title: 'Creado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }
}

async function editarTalonario(tipo, idx) {
    const lista = tipo === 'ingreso' ? talonariosIngreso : talonariosEgreso;
    const t = lista[idx];
    
    const { value: f } = await Swal.fire({
        title: 'Editar Rango',
        html: `
            <div class="text-start fs-6">
                <div class="mb-3">
                    <label class="form-label small fw-bold text-muted">NOMBRE</label>
                    <input id="sw-nom" class="form-control" value="${t.nombre}">
                </div>
                <div class="row g-3 mb-3">
                    <div class="col-6">
                        <label class="form-label small fw-bold text-muted">INICIO</label>
                        <input id="sw-ini" type="number" class="form-control" value="${t.inicio}">
                    </div>
                    <div class="col-6">
                        <label class="form-label small fw-bold text-muted">FIN</label>
                        <input id="sw-fin" type="number" class="form-control" value="${t.fin}">
                    </div>
                </div>
                <div class="alert alert-warning d-flex align-items-center small p-2 mb-0" role="alert">
                    <i class="bi bi-exclamation-triangle-fill me-2 fs-5"></i>
                    <div>
                        <strong>Cuidado:</strong> Modificar los rangos puede afectar la validación de recibos ya emitidos.
                    </div>
                </div>
            </div>`,
        showCancelButton: true,
        confirmButtonText: 'Guardar Cambios',
        cancelButtonText: 'Cancelar',
        focusConfirm: false,
        preConfirm: () => [document.getElementById('sw-nom').value, document.getElementById('sw-ini').value, document.getElementById('sw-fin').value]
    });

    if (f) {
        try {
            await authFetch(`/api/finanzas/talonarios/${t.id}`, { 
                method: 'PUT', 
                body: JSON.stringify({ nombre: f[0], inicio: parseInt(f[1]), fin: parseInt(f[2]) }) 
            });
            
            // Actualización local rápida
            t.nombre = f[0]; 
            t.inicio = parseInt(f[1]); 
            t.fin = parseInt(f[2]);
            
            renderConfigFinanzas();
            Swal.fire({ icon: 'success', title: 'Actualizado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }
}

async function activarTalonario(id, tipo) { 
    try {
        await authFetch(`/api/finanzas/talonarios/${id}`, { method: 'PUT', body: JSON.stringify({ activo: true, tipo: tipo }) }); 
        cargarDashboardFinanzas(); 
        // Pequeño delay para asegurar que la UI se refresque bien
        setTimeout(renderConfigFinanzas, 300); 
    } catch (e) { Swal.fire('Error', e.message, 'error'); }
}

async function borrarTalonario(id) { 
    const result = await Swal.fire({ 
        title: '¿Borrar Talonario?', 
        text: "Se perderá la configuración de rangos, pero los recibos ya emitidos se conservarán en el historial.", 
        icon: 'warning', 
        showCancelButton: true,
        confirmButtonColor: '#dc3545',
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
        try {
            await authFetch(`/api/finanzas/talonarios/${id}`, { method: 'DELETE' }); 
            cargarDashboardFinanzas(); 
            setTimeout(renderConfigFinanzas, 300);
            Swal.fire({ icon: 'success', title: 'Eliminado', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }
}

async function agregarCategoria() { 
    const v = document.getElementById('newCat').value; 
    if (v) { 
        try {
            await authFetch('/api/finanzas/categorias', { method: 'POST', body: JSON.stringify({ nombre: v }) }); 
            const d = await authFetch('/api/finanzas/datos'); 
            categoriasEgresos = d.categorias; 
            renderConfigFinanzas(); 
            document.getElementById('newCat').value = ''; // Limpiar input
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    } 
}

async function borrarCategoria(id, el) { 
    // Animación visual antes de borrar
    el.closest('.cat-chip').classList.add('leaving'); 
    
    setTimeout(async () => { 
        try {
            await authFetch(`/api/finanzas/categorias/${id}`, { method: 'DELETE' }); 
            const d = await authFetch('/api/finanzas/datos'); 
            categoriasEgresos = d.categorias; 
            renderConfigFinanzas(); 
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }, 200); 
}

async function agregarMiembroRapido() {
    const { value: n } = await Swal.fire({ 
        title: 'Nuevo Donante', 
        input: 'text', 
        inputPlaceholder: 'Nombre completo',
        showCancelButton: true,
        confirmButtonText: 'Guardar'
    });
    
    if (n) {
        try {
            await authFetch('/api/miembros', { 
                method: 'POST', 
                body: JSON.stringify({ nombre: n, fecha_nacimiento: '2000-01-01', congregacion: 'General', bautizado: false, confirmado: false }) 
            });
            
            miembrosFinanzas.push({ nombre: n });
            
            // Agregar al select activo
            const select = document.getElementById('miembroIngreso');
            if(select) {
                const o = document.createElement("option"); 
                o.text = n; o.value = n; o.selected = true;
                select.add(o);
            }
            
            Swal.fire({ title: 'Guardado', icon: 'success', toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
        } catch (e) { Swal.fire('Error', e.message, 'error'); }
    }
}