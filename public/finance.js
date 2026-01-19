// finance.js - Módulo Financiero v3 (Control Total)
console.log("Cargando Módulo Financiero v3...");

// --- VARIABLES GLOBALES ---
// En un futuro esto vendrá de la BD
let talonarios = [
    { nombre: 'Serie A (2025)', inicio: 1, fin: 100, actual: 0, activo: true, usados: [] }
];
let categoriasEgresos = ['Servicios Públicos', 'Mantenimiento', 'Ayuda Social', 'Papelería', 'Honorarios', 'Eventos'];
let transacciones = [];
let saldoActual = 0;

// --- VISTA PRINCIPAL (DASHBOARD) ---
async function cargarDashboardFinanzas() {
    const contenedor = document.getElementById('vistaFinanzas');
    
    // Aquí cargarías datos reales: await fetch...
    calcularSaldo();

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
                            <small class="text-primary fw-bold text-uppercase">Saldo en Caja</small>
                            <h2 class="fw-bold text-dark mb-0">L. ${saldoActual.toLocaleString('es-HN', {minimumFractionDigits: 2})}</h2>
                        </div>
                    </div>
                </div>

                <div class="d-grid gap-2 d-md-flex justify-content-center mb-5">
                    <button onclick="renderAperturaCuenta()" class="btn btn-warning text-dark btn-custom px-4 shadow-sm fw-bold">
                        <i class="bi bi-safe me-2"></i>Apertura Caja
                    </button>
                    <button onclick="renderRegistrarIngreso()" class="btn btn-success btn-custom px-4 shadow-sm">
                        <i class="bi bi-plus-circle-fill me-2"></i>Ingreso
                    </button>
                    <button onclick="renderRegistrarEgreso()" class="btn btn-danger btn-custom px-4 shadow-sm">
                        <i class="bi bi-dash-circle-fill me-2"></i>Gasto
                    </button>
                    <button onclick="renderConfigFinanzas()" class="btn btn-light text-muted border px-3" title="Configuración">
                        <i class="bi bi-gear-fill"></i>
                    </button>
                </div>

                <h5 class="text-dark fw-bold mb-3"><i class="bi bi-clock-history me-2"></i>Últimos Movimientos</h5>
                <div class="table-responsive">
                    <table class="table table-custom table-hover">
                        <thead>
                            <tr>
                                <th style="width: 20%;">Fecha</th>
                                <th style="width: 15%;">Tipo</th>
                                <th style="width: 45%;">Descripción</th>
                                <th style="width: 20%; text-align: right;">Monto</th>
                            </tr>
                        </thead>
                        <tbody>${generarFilasTabla()}</tbody>
                    </table>
                </div>

            </div>
        </div>
    `;
    contenedor.innerHTML = html;
}

// --- 1. APERTURA DE CUENTA (INICIO DE SISTEMA) ---
function renderAperturaCuenta() {
    const html = `
        <div class="card main-card mb-5 border-warning border-2">
            <div class="card-body p-4 p-md-5">
                <h5 class="text-warning fw-bold mb-4"><i class="bi bi-safe me-2"></i>Apertura de Caja Inicial</h5>
                <p class="text-muted">Utiliza esta opción solo para ingresar el dinero que <b>YA TIENES</b> físicamente al comenzar a usar este sistema.</p>
                
                <form id="formApertura">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold small">Monto Inicial (L.)</label>
                            <input type="number" step="0.01" id="montoApertura" class="form-control fw-bold fs-4" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small">Fecha de Corte</label>
                            <input type="date" id="fechaApertura" class="form-control" value="${new Date().toISOString().split('T')[0]}">
                        </div>
                        <div class="col-12 text-end mt-4">
                            <button type="button" onclick="cargarDashboardFinanzas()" class="btn btn-light me-2">Cancelar</button>
                            <button type="submit" class="btn btn-warning fw-bold px-4">Registrar Apertura</button>
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
        
        transacciones.unshift({
            fecha: fecha,
            tipo: 'ingreso',
            categoria: 'SALDO INICIAL',
            descripcion: 'Apertura de Sistema - Saldo Arrastrado',
            monto: monto,
            recibo: 'N/A'
        });
        Swal.fire('Caja Abierta', 'El saldo inicial ha sido registrado.', 'success');
        cargarDashboardFinanzas();
    });
}

// --- 2. REGISTRAR INGRESO (VALIDACIÓN DE RECIBOS) ---
function renderRegistrarIngreso() {
    // Buscar Talonario Activo
    const tal = talonarios.find(t => t.activo);
    let msjTalonario = tal ? `${tal.nombre} (${tal.inicio} - ${tal.fin})` : '⚠️ NO HAY TALONARIO ACTIVO';
    let siguienteSugerido = tal ? tal.actual + 1 : '';

    // Select de Miembros
    let opts = '<option value="">Anónimo / Varios</option>';
    if (typeof miembrosActuales !== 'undefined') {
        miembrosActuales.forEach(m => opts += `<option value="${m.nombre}">${m.nombre}</option>`);
    }

    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="text-success fw-bold m-0">Registrar Ingreso</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-close"></button>
                </div>

                <form id="formIngreso">
                    <div class="row g-3">
                        <div class="col-md-12">
                            <div class="alert alert-light border d-flex align-items-center" role="alert">
                                <i class="bi bi-book-fill text-success fs-4 me-3"></i>
                                <div>
                                    <small class="text-muted d-block">Talonario Activo:</small>
                                    <strong>${msjTalonario}</strong>
                                </div>
                            </div>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label small fw-bold">Número de Recibo</label>
                            <input type="number" id="numRecibo" class="form-control fw-bold text-end" 
                                   placeholder="${tal ? 'Ej: '+siguienteSugerido : 'Sin rango'}" ${!tal ? 'disabled' : ''}>
                            <div id="reciboFeedback" class="form-text text-end small"></div>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label small fw-bold">Tipo</label>
                            <select class="form-select" id="tipoIngreso">
                                <option value="Diezmo">Diezmo</option>
                                <option value="Ofrenda">Ofrenda</option>
                                <option value="Actividad">Actividad</option>
                                <option value="Donacion">Donación</option>
                            </select>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label small fw-bold">Monto (L.)</label>
                            <input type="number" step="0.01" id="montoIngreso" class="form-control fw-bold text-success" required>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Miembro (Opcional)</label>
                            <select class="form-select" id="miembroIngreso">${opts}</select>
                        </div>
                        
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Detalle</label>
                            <input type="text" id="detalleIngreso" class="form-control" placeholder="Descripción breve">
                        </div>

                        <div class="col-12 text-end mt-4">
                            <button type="submit" class="btn btn-success btn-custom px-5">Guardar Ingreso</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    `;
    document.getElementById('vistaFinanzas').innerHTML = html;

    // Validación en tiempo real del recibo
    const inputRecibo = document.getElementById('numRecibo');
    inputRecibo.addEventListener('input', () => {
        const val = parseInt(inputRecibo.value);
        const feed = document.getElementById('reciboFeedback');
        
        if (!tal) return;

        if (val < tal.inicio || val > tal.fin) {
            inputRecibo.classList.add('is-invalid');
            inputRecibo.classList.remove('is-valid');
            feed.className = 'form-text text-danger small';
            feed.innerText = `Fuera de rango (${tal.inicio}-${tal.fin})`;
        } else if (tal.usados.includes(val)) {
            inputRecibo.classList.add('is-invalid');
            inputRecibo.classList.remove('is-valid');
            feed.className = 'form-text text-danger small';
            feed.innerText = `¡El recibo #${val} ya existe!`;
        } else {
            inputRecibo.classList.remove('is-invalid');
            inputRecibo.classList.add('is-valid');
            feed.className = 'form-text text-success small';
            feed.innerText = 'Recibo disponible';
        }
    });

    // Guardar
    document.getElementById('formIngreso').addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Validaciones Finales
        if (tal) {
            const nRecibo = parseInt(inputRecibo.value);
            if (!nRecibo) {
                Swal.fire('Error', 'Debes ingresar el número de recibo físico.', 'error');
                return;
            }
            if (nRecibo < tal.inicio || nRecibo > tal.fin) {
                Swal.fire('Recibo Inválido', `El número debe estar entre ${tal.inicio} y ${tal.fin}`, 'error');
                return;
            }
            if (tal.usados.includes(nRecibo)) {
                Swal.fire('Recibo Duplicado', `El recibo #${nRecibo} ya fue registrado anteriormente.`, 'error');
                return;
            }
            
            // Si pasa todo, lo marcamos como usado y actualizamos el "actual" si es mayor
            tal.usados.push(nRecibo);
            if (nRecibo > tal.actual) tal.actual = nRecibo;
        }

        const monto = parseFloat(document.getElementById('montoIngreso').value);
        const miembro = document.getElementById('miembroIngreso').value;
        const desc = document.getElementById('detalleIngreso').value;
        
        transacciones.unshift({
            fecha: new Date().toISOString(),
            tipo: 'ingreso',
            categoria: document.getElementById('tipoIngreso').value,
            descripcion: `${miembro ? miembro + ' - ' : ''}${desc}`,
            monto: monto,
            recibo: inputRecibo.value ? String(inputRecibo.value).padStart(6,'0') : 'S/N'
        });

        Swal.fire('Guardado', 'Ingreso registrado correctamente', 'success');
        cargarDashboardFinanzas();
    });
}

// --- 3. GESTIÓN DE EGRESOS (SIMPLE) ---
function renderRegistrarEgreso() {
    let opts = categoriasEgresos.map(c => `<option value="${c}">${c}</option>`).join('');
    
    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="text-danger fw-bold m-0">Registrar Gasto</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-close"></button>
                </div>
                <form id="formEgreso">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Categoría</label>
                            <select class="form-select" id="catEgreso">${opts}<option value="OTRO">OTRO</option></select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Monto (L.)</label>
                            <input type="number" step="0.01" id="montoEgreso" class="form-control fw-bold text-danger" required>
                        </div>
                        <div class="col-12">
                            <label class="form-label small fw-bold">Descripción</label>
                            <textarea id="descEgreso" class="form-control" rows="2" placeholder="Detalle..."></textarea>
                        </div>
                        <div class="col-12 text-end mt-4">
                            <button type="submit" class="btn btn-danger btn-custom px-5">Registrar Salida</button>
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
        Swal.fire('Guardado', '', 'success');
        cargarDashboardFinanzas();
    });
}

// --- 4. CONFIGURACIÓN DE TALONARIOS (EDICIÓN Y BORRADO) ---
function renderConfigFinanzas() {
    let listaHTML = talonarios.map((t, i) => `
        <li class="list-group-item p-3">
            <div class="d-flex justify-content-between align-items-start">
                <div>
                    <div class="fw-bold text-dark">${t.nombre}</div>
                    <div class="small text-muted">Rango: ${t.inicio} - ${t.fin}</div>
                    <div class="mt-1">
                        ${t.activo 
                            ? '<span class="badge bg-success">ACTIVO</span>' 
                            : `<button onclick="activarTalonario(${i})" class="btn btn-sm btn-outline-secondary py-0">Activar</button>`
                        }
                    </div>
                </div>
                <div class="text-end">
                    <div class="fw-bold text-primary mb-2">Último: #${t.actual}</div>
                    <div class="btn-group">
                        <button onclick="verDetalleTalonario(${i})" class="btn btn-sm btn-light border" title="Ver Recibos Usados"><i class="bi bi-eye"></i></button>
                        <button onclick="editarTalonario(${i})" class="btn btn-sm btn-light border text-primary"><i class="bi bi-pencil"></i></button>
                        <button onclick="borrarTalonario(${i})" class="btn btn-sm btn-light border text-danger"><i class="bi bi-trash"></i></button>
                    </div>
                </div>
            </div>
        </li>
    `).join('');

    const html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-md-5">
                <div class="d-flex justify-content-between align-items-center mb-4">
                    <h5 class="text-dark fw-bold m-0"><i class="bi bi-gear-fill me-2"></i>Configuración</h5>
                    <button onclick="cargarDashboardFinanzas()" class="btn btn-close"></button>
                </div>

                <div class="row g-4">
                    <div class="col-md-7">
                        <div class="card bg-light border-0 h-100">
                            <div class="card-body">
                                <h6 class="fw-bold text-dark mb-3">📚 Mis Talonarios</h6>
                                <ul class="list-group shadow-sm mb-3 bg-white rounded">${listaHTML}</ul>
                                <button onclick="nuevoTalonario()" class="btn btn-outline-primary w-100 dashed-border">
                                    <i class="bi bi-plus-lg me-1"></i>Agregar Talonario
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="col-md-5">
                        <div class="card bg-light border-0 h-100">
                            <div class="card-body">
                                <h6 class="fw-bold text-dark mb-3">📋 Categorías Gastos</h6>
                                <div class="d-flex gap-2 mb-2">
                                    <input type="text" id="newCat" class="form-control form-control-sm" placeholder="Nueva...">
                                    <button onclick="agregarCategoria()" class="btn btn-dark btn-sm"><i class="bi bi-plus"></i></button>
                                </div>
                                <div class="d-flex flex-wrap gap-2">
                                    ${categoriasEgresos.map(c => `<span class="badge bg-white text-dark border p-2">${c} <i class="bi bi-x text-danger ms-1 cursor-pointer" onclick="borrarCategoria('${c}')"></i></span>`).join('')}
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

// --- LOGICA DE TALONARIOS ---

async function nuevoTalonario() {
    const { value: f } = await Swal.fire({
        title: 'Nuevo Talonario',
        html: `
            <input id="sw1" class="swal2-input" placeholder="Nombre (Ej: Serie B)">
            <input id="sw2" class="swal2-input" type="number" placeholder="Inicio (Ej: 101)">
            <input id="sw3" class="swal2-input" type="number" placeholder="Fin (Ej: 200)">
        `,
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
            actual: parseInt(f[1]) - 1, // Empieza uno antes
            activo: talonarios.length === 0,
            usados: []
        });
        renderConfigFinanzas();
    }
}

async function editarTalonario(idx) {
    const t = talonarios[idx];
    const { value: f } = await Swal.fire({
        title: 'Editar Talonario',
        html: `
            <label class="d-block text-start small fw-bold">Nombre</label>
            <input id="sw1" class="swal2-input" value="${t.nombre}">
            <label class="d-block text-start small fw-bold mt-2">Fin del Rango</label>
            <input id="sw3" class="swal2-input" type="number" value="${t.fin}">
            <div class="text-danger small mt-2">Nota: No puedes cambiar el inicio si ya se usó.</div>
        `,
        focusConfirm: false,
        preConfirm: () => [
            document.getElementById('sw1').value,
            document.getElementById('sw3').value
        ]
    });

    if (f) {
        t.nombre = f[0];
        t.fin = parseInt(f[1]);
        renderConfigFinanzas();
    }
}

function borrarTalonario(idx) {
    Swal.fire({
        title: '¿Estás seguro?',
        text: "Si borras este talonario, perderás el control de sus números usados.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        confirmButtonText: 'Sí, borrar'
    }).then((result) => {
        if (result.isConfirmed) {
            talonarios.splice(idx, 1);
            renderConfigFinanzas();
            Swal.fire('Borrado', '', 'success');
        }
    });
}

function verDetalleTalonario(idx) {
    const t = talonarios[idx];
    const usadosStr = t.usados.sort((a,b)=>a-b).join(', ') || 'Ninguno';
    Swal.fire({
        title: t.nombre,
        html: `
            <p><b>Rango:</b> ${t.inicio} - ${t.fin}</p>
            <p><b>Recibos ya emitidos:</b></p>
            <div style="max-height: 150px; overflow-y: auto; background: #f8f9fa; padding: 10px; border-radius: 5px;">
                ${usadosStr}
            </div>
        `
    });
}

function activarTalonario(idx) {
    talonarios.forEach(t => t.activo = false);
    talonarios[idx].activo = true;
    renderConfigFinanzas();
}

// --- HELPERS ---
function agregarCategoria() {
    const v = document.getElementById('newCat').value;
    if(v) { categoriasEgresos.push(v); renderConfigFinanzas(); }
}
function borrarCategoria(c) {
    categoriasEgresos = categoriasEgresos.filter(item => item !== c);
    renderConfigFinanzas();
}
function calcularSaldo() {
    saldoActual = 0;
    transacciones.forEach(t => {
        if (t.tipo === 'ingreso') saldoActual += t.monto;
        else saldoActual -= t.monto;
    });
}
function generarFilasTabla() {
    if (transacciones.length === 0) return '<tr><td colspan="4" class="text-center py-4 text-muted">Sin movimientos</td></tr>';
    
    return transacciones.map(t => {
        const esIngreso = t.tipo === 'ingreso';
        const color = esIngreso ? 'text-success' : 'text-danger';
        const signo = esIngreso ? '+' : '-';
        const icono = esIngreso ? 'bi-arrow-down-left' : 'bi-arrow-up-right';
        const badgeClass = esIngreso ? 'bg-success' : 'bg-danger';
        const fTexto = new Date(t.fecha).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
        
        // Badge de Recibo
        let reciboHtml = '';
        if(t.recibo && t.recibo !== 'N/A' && t.recibo !== '-') {
            reciboHtml = `<span class="badge bg-light text-dark border ms-2">#${t.recibo}</span>`;
        } else if (t.categoria === 'SALDO INICIAL') {
            reciboHtml = `<span class="badge bg-warning text-dark border ms-2">APERTURA</span>`;
        }

        return `
            <tr>
                <td data-label="Fecha"><span class="badge-date text-center">${fTexto}</span></td>
                <td data-label="Tipo">
                    <span class="badge ${badgeClass} bg-opacity-10 ${color} border border-opacity-25">
                        <i class="bi ${icono} me-1"></i>${t.categoria}
                    </span>
                </td>
                <td data-label="Descripción">
                    <div class="fw-bold text-dark">${t.descripcion}</div>
                    ${reciboHtml}
                </td>
                <td data-label="Monto" class="text-end">
                    <span class="fw-bold ${color} fs-5">${signo} L. ${t.monto.toFixed(2)}</span>
                </td>
            </tr>
        `;
    }).join('');
}