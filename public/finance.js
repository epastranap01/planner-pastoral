// finance.js - Módulo Financiero v4 (Cultos, Miembros Rápidos y Edición Saldo)
console.log("Cargando Módulo Financiero v4...");

// --- VARIABLES GLOBALES ---
// Simulamos base de datos
let talonarios = [
    { nombre: 'Serie A (2025)', inicio: 1, fin: 100, actual: 0, activo: true, usados: [] }
];
let categoriasEgresos = ['Servicios Públicos', 'Mantenimiento', 'Ayuda Social', 'Papelería', 'Honorarios', 'Eventos', 'Limpieza'];
let tiposCultos = ['Culto Dominical', 'Escuela Dominical', 'Culto de Oración (Martes)', 'Culto de Enseñanza (Jueves)', 'Reunión de Jóvenes', 'Reunión de Damas', 'Vigilia'];

let transacciones = [];
let saldoActual = 0;

// --- VISTA PRINCIPAL (DASHBOARD) ---
async function cargarDashboardFinanzas() {
    const contenedor = document.getElementById('vistaFinanzas');
    
    // Recalcular saldo siempre al entrar
    calcularSaldo();

    let html = `
        <div class="card main-card mb-5">
            <div class="card-body p-4 p-md-5">
                
                <div class="row align-items-center mb-5">
                    <div class="col-md-6">
                        <h5 class="text-primary fw-bold mb-0"><i class="bi bi-cash-coin me-2"></i>Gestión Financiera</h5>
                        <p class="text-muted small mb-0">Control de Caja, Diezmos y Ofrendas</p>
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
                        <i class="bi bi-safe me-2"></i>Apertura / Ajuste
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
                                <th style="width: 20%;">Tipo / Culto</th>
                                <th style="width: 40%;">Descripción</th>
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

// --- 1. APERTURA DE CUENTA (AHORA CON EDICIÓN) ---
function renderAperturaCuenta() {
    // Buscar si ya existe un saldo inicial
    const saldoExistente = transacciones.find(t => t.categoria === 'SALDO INICIAL');
    const valorActual = saldoExistente ? saldoExistente.monto : '';
    const fechaActual = saldoExistente ? new Date(saldoExistente.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    const titulo = saldoExistente ? 'Modificar Saldo Inicial' : 'Apertura de Caja Inicial';
    const btnTexto = saldoExistente ? 'Actualizar Saldo' : 'Registrar Apertura';

    const html = `
        <div class="card main-card mb-5 border-warning border-2">
            <div class="card-body p-4 p-md-5">
                <h5 class="text-warning fw-bold mb-4"><i class="bi bi-safe me-2"></i>${titulo}</h5>
                <p class="text-muted">
                    ${saldoExistente 
                        ? '⚠️ <b>Atención:</b> Ya existe un saldo inicial registrado. Al modificarlo, el saldo total de la caja cambiará.' 
                        : 'Utiliza esta opción para ingresar el dinero que <b>YA TIENES</b> físicamente al comenzar.'}
                </p>
                
                <form id="formApertura">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label fw-bold small">Monto Inicial (L.)</label>
                            <input type="number" step="0.01" id="montoApertura" class="form-control fw-bold fs-4" value="${valorActual}" required>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label fw-bold small">Fecha de Corte</label>
                            <input type="date" id="fechaApertura" class="form-control" value="${fechaActual}">
                        </div>
                        <div class="col-12 text-end mt-4">
                            <button type="button" onclick="cargarDashboardFinanzas()" class="btn btn-light me-2">Cancelar</button>
                            <button type="submit" class="btn btn-warning fw-bold px-4">${btnTexto}</button>
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
            // EDITAR: Actualizamos el objeto existente
            saldoExistente.monto = monto;
            saldoExistente.fecha = fecha;
            Swal.fire('Actualizado', 'El saldo inicial ha sido corregido.', 'success');
        } else {
            // CREAR: Agregamos uno nuevo
            transacciones.push({ // Push al final o unshift, aquí usaremos lógica de fecha después
                fecha: fecha,
                tipo: 'ingreso',
                categoria: 'SALDO INICIAL',
                descripcion: 'Apertura de Sistema - Saldo Arrastrado',
                monto: monto,
                recibo: 'APERTURA'
            });
            Swal.fire('Caja Abierta', 'El saldo inicial ha sido registrado.', 'success');
        }
        cargarDashboardFinanzas();
    });
}

// --- 2. REGISTRAR INGRESO (CULTOS Y MIEMBROS) ---
function renderRegistrarIngreso() {
    const tal = talonarios.find(t => t.activo);
    let msjTalonario = tal ? `${tal.nombre} (${tal.inicio} - ${tal.fin})` : '⚠️ NO HAY TALONARIO ACTIVO';
    let siguienteSugerido = tal ? tal.actual + 1 : '';

    // Generar opciones de miembros
    let optsMiembros = '<option value="">Anónimo / Varios</option>';
    if (typeof miembrosActuales !== 'undefined') {
        miembrosActuales.forEach(m => optsMiembros += `<option value="${m.nombre}">${m.nombre}</option>`);
    }

    // Generar opciones de Cultos
    let optsCultos = tiposCultos.map(c => `<option value="${c}">${c}</option>`).join('');

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
                            <div class="alert alert-light border d-flex align-items-center py-2" role="alert">
                                <i class="bi bi-book-fill text-success fs-5 me-2"></i>
                                <small class="text-muted">Talonario: <strong>${msjTalonario}</strong></small>
                            </div>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label small fw-bold">Recibo #</label>
                            <input type="number" id="numRecibo" class="form-control fw-bold text-end" 
                                   placeholder="${tal ? siguienteSugerido : '---'}" ${!tal ? 'disabled' : ''}>
                            <div id="reciboFeedback" class="form-text text-end small" style="min-height:20px"></div>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label small fw-bold">Tipo de Ingreso</label>
                            <select class="form-select" id="tipoIngreso" onchange="toggleCultos(this.value)">
                                <option value="Ofrenda">Ofrenda</option>
                                <option value="Diezmo">Diezmo</option>
                                <option value="Actividad">Actividad / Evento</option>
                                <option value="Donacion">Donación Especial</option>
                            </select>
                        </div>

                        <div class="col-md-4">
                            <label class="form-label small fw-bold">Monto (L.)</label>
                            <input type="number" step="0.01" id="montoIngreso" class="form-control fw-bold text-success fs-5" required>
                        </div>

                        <div class="col-md-6" id="divCultos">
                            <label class="form-label small fw-bold text-primary">Servicio / Culto</label>
                            <select class="form-select border-primary bg-light" id="selectCulto">
                                <option value="General">General / No Aplica</option>
                                ${optsCultos}
                            </select>
                        </div>

                        <div class="col-md-6">
                            <label class="form-label small fw-bold">Miembro / Donante</label>
                            <div class="input-group">
                                <select class="form-select" id="miembroIngreso">
                                    ${optsMiembros}
                                </select>
                                <button class="btn btn-outline-secondary" type="button" onclick="agregarMiembroRapido()" title="Agregar Nuevo Miembro">
                                    <i class="bi bi-person-plus-fill"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="col-12">
                            <label class="form-label small fw-bold">Nota / Detalle Adicional</label>
                            <input type="text" id="detalleIngreso" class="form-control" placeholder="Ej: Ofrenda pro-templo, Venta de comida...">
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

    // Listeners
    setupValidacionRecibo(tal); // Función auxiliar abajo

    document.getElementById('formIngreso').addEventListener('submit', (e) => {
        e.preventDefault();
        guardarIngreso(tal);
    });
}

function toggleCultos(valor) {
    const div = document.getElementById('divCultos');
    const select = document.getElementById('selectCulto');
    
    // Si es Diezmo, usualmente no se ata a un culto específico (o tal vez sí, tú decides)
    // Aquí mostramos cultos si es Ofrenda o Actividad
    if (valor === 'Ofrenda' || valor === 'Actividad') {
        div.style.display = 'block';
    } else {
        div.style.display = 'none';
        select.value = 'General';
    }
}

async function agregarMiembroRapido() {
    const { value: nombre } = await Swal.fire({
        title: 'Nuevo Donante',
        input: 'text',
        inputLabel: 'Nombre Completo',
        showCancelButton: true,
        inputValidator: (value) => {
            if (!value) return '¡Necesitas escribir un nombre!';
        }
    });

    if (nombre) {
        // Agregamos a la lista global (temporalmente en memoria)
        if (typeof miembrosActuales !== 'undefined') {
            miembrosActuales.push({ nombre: nombre, id: Date.now() }); // ID temporal
            
            // Recargamos solo el select para que aparezca
            const select = document.getElementById('miembroIngreso');
            const option = document.createElement("option");
            option.text = nombre;
            option.value = nombre;
            option.selected = true; // Lo seleccionamos de una vez
            select.add(option);
            
            Swal.fire({
                icon: 'success',
                title: 'Agregado',
                text: `${nombre} seleccionado.`,
                timer: 1500,
                showConfirmButton: false
            });
        }
    }
}

function guardarIngreso(tal) {
    const inputRecibo = document.getElementById('numRecibo');
    const nRecibo = parseInt(inputRecibo.value);

    // Validaciones
    if (tal) {
        if (!nRecibo) return Swal.fire('Error', 'Falta el número de recibo', 'error');
        if (nRecibo < tal.inicio || nRecibo > tal.fin) return Swal.fire('Error', 'Recibo fuera de rango', 'error');
        if (tal.usados.includes(nRecibo)) return Swal.fire('Error', 'Recibo duplicado', 'error');
        
        // Actualizar Talonario
        tal.usados.push(nRecibo);
        if (nRecibo > tal.actual) tal.actual = nRecibo;
    }

    const tipo = document.getElementById('tipoIngreso').value;
    const culto = document.getElementById('selectCulto').value;
    const miembro = document.getElementById('miembroIngreso').value;
    const detalle = document.getElementById('detalleIngreso').value;
    const monto = parseFloat(document.getElementById('montoIngreso').value);

    // Construir descripción rica
    let descFinal = "";
    if (tipo === 'Ofrenda') descFinal = `${culto}`; 
    else descFinal = tipo;
    
    if (miembro) descFinal += ` - ${miembro}`;
    if (detalle) descFinal += ` (${detalle})`;

    transacciones.unshift({
        fecha: new Date().toISOString(),
        tipo: 'ingreso',
        categoria: tipo, // Guardamos "Ofrenda" o "Diezmo" como categoría base
        descripcion: descFinal,
        monto: monto,
        recibo: inputRecibo.value ? String(inputRecibo.value).padStart(6,'0') : 'S/N'
    });

    Swal.fire('Guardado', 'Ingreso registrado correctamente', 'success');
    cargarDashboardFinanzas();
}

function setupValidacionRecibo(tal) {
    const input = document.getElementById('numRecibo');
    const feed = document.getElementById('reciboFeedback');
    
    input.addEventListener('input', () => {
        if (!tal) return;
        const val = parseInt(input.value);
        if (val < tal.inicio || val > tal.fin) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            feed.className = 'form-text text-danger small';
            feed.innerText = 'Fuera de rango';
        } else if (tal.usados.includes(val)) {
            input.classList.add('is-invalid');
            input.classList.remove('is-valid');
            feed.className = 'form-text text-danger small';
            feed.innerText = '¡Ya existe!';
        } else {
            input.classList.remove('is-invalid');
            input.classList.add('is-valid');
            feed.className = 'form-text text-success small';
            feed.innerText = 'Disponible';
        }
    });
}


// --- 3. EGRESOS (Mantiene igual) ---
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

// --- 4. CONFIGURACIÓN (Mantiene igual, solo utilidades) ---
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
                        <button onclick="verDetalleTalonario(${i})" class="btn btn-sm btn-light border" title="Ver Recibos"><i class="bi bi-eye"></i></button>
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
                                <h6 class="fw-bold text-dark mb-3">📚 Talonarios</h6>
                                <ul class="list-group shadow-sm mb-3 bg-white rounded">${listaHTML}</ul>
                                <button onclick="nuevoTalonario()" class="btn btn-outline-primary w-100 dashed-border"><i class="bi bi-plus-lg me-1"></i>Agregar Talonario</button>
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

// --- Helpers de Configuración ---
async function nuevoTalonario() {
    const { value: f } = await Swal.fire({
        title: 'Nuevo Talonario',
        html: `<input id="sw1" class="swal2-input" placeholder="Nombre"><input id="sw2" class="swal2-input" type="number" placeholder="Inicio"><input id="sw3" class="swal2-input" type="number" placeholder="Fin">`,
        focusConfirm: false,
        preConfirm: () => [document.getElementById('sw1').value, document.getElementById('sw2').value, document.getElementById('sw3').value]
    });
    if (f && f[0]) {
        talonarios.push({ nombre: f[0], inicio: parseInt(f[1]), fin: parseInt(f[2]), actual: parseInt(f[1])-1, activo: false, usados: [] });
        renderConfigFinanzas();
    }
}
function activarTalonario(idx) { talonarios.forEach(t => t.activo = false); talonarios[idx].activo = true; renderConfigFinanzas(); }
function agregarCategoria() { const v = document.getElementById('newCat').value; if(v){ categoriasEgresos.push(v); renderConfigFinanzas(); } }
function borrarCategoria(c) { categoriasEgresos = categoriasEgresos.filter(i => i !== c); renderConfigFinanzas(); }
function editarTalonario(idx) { 
    // Implementar si se desea, similar a nuevoTalonario pero prellenado
    Swal.fire('Info', 'Funcionalidad de edición simplificada para demo.', 'info');
}
function borrarTalonario(idx) { talonarios.splice(idx, 1); renderConfigFinanzas(); }
function verDetalleTalonario(idx) {
    const t = talonarios[idx];
    Swal.fire({ title: t.nombre, html: `Usados: ${t.usados.join(', ')}` });
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
        const fTexto = new Date(t.fecha).toLocaleDateString('es-HN', { day: 'numeric', month: 'short' });
        
        // Renderizado inteligente del recibo
        let reciboBadge = '';
        if (t.recibo === 'APERTURA') reciboBadge = '<span class="badge bg-warning text-dark ms-2">APERTURA</span>';
        else if (t.recibo && t.recibo !== 'S/N' && t.recibo !== '-') reciboBadge = `<span class="badge bg-light text-dark border ms-2">#${t.recibo}</span>`;

        return `
            <tr>
                <td data-label="Fecha"><span class="badge-date text-center">${fTexto}</span></td>
                <td data-label="Categoría">
                    <span class="badge ${esIngreso?'bg-success':'bg-danger'} bg-opacity-10 ${color} border border-opacity-25">
                        ${t.categoria}
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