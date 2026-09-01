// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://tu-proyecto.supabase.co'; // Asegúrate de conservar tus credenciales originales si ya las tenías configuradas
const SUPABASE_KEY = 'tu-anon-key';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Variables de sesión y estado
let usuarioLogueado = null;
let filtroIdeasActual = 'mias';
let idIdeaEditando = null;
let tipoKaizenSeleccionado = 'Quick';

// Función auxiliar para formatear el nombre completo sin mostrar "null"
function obtenerNombreCompleto(piloto) {
    if (!piloto) return 'Piloto Anónimo';
    let nombre = piloto.nombre || '';
    let apellido = piloto.apellido || '';
    let completo = `${nombre} ${apellido}`.replace(/null/g, '').trim();
    return completo !== '' ? completo : 'Piloto';
}

document.addEventListener('DOMContentLoaded', () => {
    // Verificar si hay sesión guardada en localStorage
    const savedUser = localStorage.getItem('kaizen_user');
    if (savedUser) {
        usuarioLogueado = JSON.parse(savedUser);
        mostrarApp();
    }

    // Botones de autenticación
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', iniciarSesion);

    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', registrarPiloto);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', cerrarSesion);

    // Botón guardar idea
    const guardarBtn = document.getElementById('guardarIdea');
    if (guardarBtn) guardarBtn.addEventListener('click', guardarPropuesta);

    // Modal de edición
    const btnGuardarEdicion = document.getElementById('guardarEdicion');
    if (btnGuardarEdicion) btnGuardarEdicion.addEventListener('click', confirmarEdicion);

    const btnCancelarEdicion = document.getElementById('cancelarEdicion');
    if (btnCancelarEdicion) btnCancelarEdicion.addEventListener('click', cerrarModalEdicion);
});

// Selector visual de tipo de kaizen
function seleccionarTipoKaizen(tipo) {
    tipoKaizenSeleccionado = tipo;
    const selectTipo = document.getElementById('tipo');
    if (selectTipo) selectTipo.value = tipo;

    const quickCard = document.getElementById('typeQuickCard');
    const standardCard = document.getElementById('typeStandardCard');

    if (tipo === 'Quick') {
        quickCard.classList.add('selected');
        standardCard.classList.remove('selected');
    } else {
        standardCard.classList.add('selected');
        quickCard.classList.remove('selected');
    }
}

// --- LOGIN Y REGISTRO ---
async function iniciarSesion() {
    const ci = document.getElementById('ciInput').value.trim();
    if (!ci) {
        alert('Por favor ingresa tu cédula');
        return;
    }

    const { data, error } = await supabase
        .from('pilotos')
        .select('*')
        .eq('ci', ci)
        .single();

    if (error || !data) {
        alert('Cédula no encontrada. Por favor regístrate primero.');
        return;
    }

    usuarioLogueado = data;
    localStorage.setItem('kaizen_user', JSON.stringify(data));
    mostrarApp();
}

async function registrarPiloto() {
    const nombre = document.getElementById('nombreInput').value.trim();
    const apellido = document.getElementById('apellidoInput').value.trim();
    const ci = document.getElementById('ciRegistroInput').value.trim();

    if (!nombre || !apellido || !ci) {
        alert('Completa todos los campos para registrarte.');
        return;
    }

    const { data, error } = await supabase
        .from('pilotos')
        .insert([{ nombre, apellido, ci }])
        .select()
        .single();

    if (error) {
        alert('Error al registrar: ' + error.message);
        return;
    }

    alert('¡Registro exitoso! Ya puedes ingresar.');
    document.getElementById('ciInput').value = ci;
}

function cerrarSesion() {
    localStorage.removeItem('kaizen_user');
    usuarioLogueado = null;
    document.getElementById('appArea').classList.add('hidden');
    document.getElementById('loginArea').classList.remove('hidden');
}

function mostrarApp() {
    document.getElementById('loginArea').classList.add('hidden');
    document.getElementById('appArea').classList.remove('hidden');
    
    const nombreCompleto = obtenerNombreCompleto(usuarioLogueado);
    document.getElementById('usuarioActual').textContent = nombreCompleto.toUpperCase();
    
    cargarDatosApp();
}

// --- NAVEGACIÓN ENTRE PESTAÑAS ---
function cambiarPestana(idTab, elementoBoton) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

    document.getElementById(idTab).classList.add('active');
    elementoBoton.classList.add('active');

    cargarDatosApp();
}

function cambiarFiltroIdeas(filtro) {
    filtroIdeasActual = filtro;
    const btnMias = document.getElementById('btnFiltroMias');
    const btnTodas = document.getElementById('btnFiltroTodas');

    if (filtro === 'mias') {
        btnMias.classList.add('active');
        btnTodas.classList.remove('active');
    } else {
        btnTodas.classList.add('active');
        btnMias.classList.remove('active');
    }
    cargarIdeas();
}

// --- CARGA DE DATOS GENERALES ---
async function cargarDatosApp() {
    await cargarContadores();
    await cargarIdeas();
    await cargarPista();
}

// --- CONTADORES ---
async function cargarContadores() {
    // Contadores generales de registrar
    const { data: todas, error } = await supabase.from('ideas').select('*');
    if (error) return;

    const total = todas.length;
    const abiertas = todas.filter(i => i.estado === 'Abierto' || !i.estado).length;
    const cerradas = todas.filter(i => i.estado === 'Cerrado').length;

    document.getElementById('countTotal').textContent = total;
    document.getElementById('countAbiertas').textContent = abiertas;
    document.getElementById('countCerradas').textContent = cerradas;

    // Contadores de Mis Ideas (filtradas por el usuario actual)
    const misIdeas = todas.filter(i => i.pilot_id === usuarioLogueado.id);
    const misTotal = misIdeas.length;
    const misAbiertas = misIdeas.filter(i => i.estado === 'Abierto' || !i.estado).length;
    const misCerradas = misIdeas.filter(i => i.estado === 'Cerrado').length;

    document.getElementById('countMisTotal').textContent = misTotal;
    document.getElementById('countMisAbiertas').textContent = misAbiertas;
    document.getElementById('countMisCerradas').textContent = misCerradas;
}

// --- GESTIÓN DE IDEAS ---
async function guardarPropuesta() {
    const titulo = document.getElementById('titulo').value.trim();
    const area = document.getElementById('area').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const tipo = document.getElementById('tipo').value;

    if (!titulo || !descripcion) {
        alert('El título y la descripción son obligatorios.');
        return;
    }

    const { error } = await supabase.from('ideas').insert([{
        titulo,
        area: area || 'General',
        descripcion,
        tipo,
        estado: 'Abierto',
        pilot_id: usuarioLogueado.id
    }]);

    if (error) {
        alert('Error al guardar: ' + error.message);
        return;
    }

    alert('¡Propuesta registrada con éxito!');
    document.getElementById('titulo').value = '';
    document.getElementById('area').value = '';
    document.getElementById('descripcion').value = '';

    cargarDatosApp();
    // Cambiar automáticamente a la pestaña de Mis Ideas
    document.querySelectorAll('.nav-item')[1].click();
}

async function cargarIdeas() {
    const contenedor = document.getElementById('listaIdeas');
    contenedor.innerHTML = '<p style="text-align:center; color:white;">Cargando ideas...</p>';

    let query = supabase.from('ideas').select('*, pilotos(nombre, apellido)');
    if (filtroIdeasActual === 'mias') {
        query = query.eq('pilot_id', usuarioLogueado.id);
    }

    const { data: ideas, error } = await query.order('created_at', { ascending: false });

    if (error) {
        contenedor.innerHTML = '<p style="text-align:center; color:white;">Error al cargar ideas.</p>';
        return;
    }

    if (!ideas || ideas.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-state">
                <span>📭</span>
                <h3>No hay propuestas aquí</h3>
                <p>Comienza registrando una nueva mejora en la pestaña Registrar.</p>
            </div>
        `;
        return;
    }

    let html = '';
    ideas.forEach(idea => {
        const esMio = idea.pilot_id === usuarioLogueado.id;
        const estado = idea.estado || 'Abierto';
        const badgeClass = estado === 'Cerrado' ? 'status-cerrado' : 'status-abierto';
        const nombrePiloto = obtenerNombreCompleto(idea.pilotos);
        const fechaFormateada = idea.created_at ? new Date(idea.created_at).toLocaleDateString() : '';

        html += `
            <div class="idea-card">
                <div class="idea-card-header">
                    <div>
                        <span class="status-badge ${badgeClass}">${estado}</span>
                        <h3 style="margin-top: 6px;">${idea.titulo}</h3>
                    </div>
                </div>
                <p>${idea.descripcion}</p>
                <div class="idea-tags">
                    <span class="tag-type">${idea.tipo || 'Quick'}</span>
                    <span class="tag-meta">${idea.area || 'General'}</span>
                    <span class="tag-meta">Por: ${nombrePiloto}</span>
                    <span class="idea-date">${fechaFormateada}</span>
                </div>
                ${esMio ? `
                    <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid var(--border); padding-top: 10px;">
                        <button onclick="abrirModalEditar('${idea.id}', '${encodeURIComponent(idea.titulo)}', '${encodeURIComponent(idea.area)}', '${idea.tipo}', '${encodeURIComponent(idea.descripcion)}')" style="background-color: var(--warning); padding: 6px 12px; font-size: 12px; width: auto; box-shadow: none;">Editar</button>
                        ${estado === 'Abierto' ? `<button onclick="cambiarEstadoIdea('${idea.id}', 'Cerrado')" style="background-color: var(--success); padding: 6px 12px; font-size: 12px; width: auto; box-shadow: none;">Cerrar</button>` : ''}
                        <button onclick="eliminarIdea('${idea.id}')" style="background-color: var(--danger); padding: 6px 12px; font-size: 12px; width: auto; box-shadow: none;">Eliminar</button>
                    </div>
                ` : ''}
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

async function cambiarEstadoIdea(id, nuevoEstado) {
    const { error } = await supabase.from('ideas').update({ estado: nuevoEstado }).eq('id', id);
    if (error) {
        alert('Error al actualizar estado');
        return;
    }
    cargarDatosApp();
}

async function eliminarIdea(id) {
    if (!confirm('¿Estás seguro de eliminar esta propuesta?')) return;
    const { error } = await supabase.from('ideas').delete().eq('id', id);
    if (error) {
        alert('Error al eliminar');
        return;
    }
    cargarDatosApp();
}

// --- EDICIÓN ---
function abrirModalEditar(id, titulo, area, tipo, descripcion) {
    idIdeaEditando = id;
    document.getElementById('editTitulo').value = decodeURIComponent(titulo);
    document.getElementById('editArea').value = decodeURIComponent(area);
    document.getElementById('editTipo').value = tipo;
    document.getElementById('editDescripcion').value = decodeURIComponent(descripcion);
    document.getElementById('editModal').classList.remove('hidden');
}

function cerrarModalEdicion() {
    idIdeaEditando = null;
    document.getElementById('editModal').classList.add('hidden');
}

async function confirmarEdicion() {
    if (!idIdeaEditando) return;

    const titulo = document.getElementById('editTitulo').value.trim();
    const area = document.getElementById('editArea').value.trim();
    const tipo = document.getElementById('editTipo').value;
    const descripcion = document.getElementById('editDescripcion').value.trim();

    const { error } = await supabase.from('ideas').update({
        titulo, area, tipo, descripcion
    }).eq('id', idIdeaEditando);

    if (error) {
        alert('Error al actualizar');
        return;
    }

    cerrarModalEdicion();
    cargarDatosApp();
}

// --- PISTA DE CARRERAS ---
async function cargarPista() {
    const contenedor = document.getElementById('pistaPilotosContainer');
    contenedor.innerHTML = '<p style="text-align:center; color:white;">Calculando posiciones...</p>';

    // Obtener todos los pilotos y sus ideas cerradas
    const { data: pilotos, error: errPilotos } = await supabase.from('pilotos').select('*');
    const { data: ideas, error: errIdeas } = await supabase.from('ideas').select('*');

    if (errPilotos || errIdeas) {
        contenedor.innerHTML = '<p style="text-align:center; color:white;">Error al cargar la pista.</p>';
        return;
    }

    // Calcular kaizens cerrados por piloto
    let ranking = pilotos.map(piloto => {
        const cerrados = ideas.filter(i => i.pilot_id === piloto.id && i.estado === 'Cerrado').length;
        return {
            ...piloto,
            cerrados
        };
    });

    // Ordenar de mayor a menor según kaizens cerrados
    ranking.sort((a, b) => b.cerrados - a.cerrados);

    // Encontrar posición del usuario actual
    const indexUsuario = ranking.findIndex(p => p.id === usuarioLogueado.id);
    const miPosicion = indexUsuario !== -1 ? indexUsuario + 1 : 1;
    const misCerrados = indexUsuario !== -1 ? ranking[indexUsuario].cerrados : 0;

    document.getElementById('posicionTexto').textContent = `${miPosicion} / ${ranking.length}`;
    document.getElementById('misKaizensCerradosNum').textContent = misCerrados;

    // Meta de la pista (ej. 10 kaizens para llegar al 100%, o dinámico si alguien supera los 10)
    const metaPista = Math.max(10, ...ranking.map(r => r.cerrados));

    let html = '';
    ranking.forEach((piloto, idx) => {
        const esMio = piloto.id === usuarioLogueado.id;
        const nombreCompleto = obtenerNombreCompleto(piloto);
        
        // Calcular porcentaje de avance en la pista (máximo 90% para que el auto no se pase de la bandera de meta)
        let porcentajeAvance = (piloto.cerrados / metaPista) * 85;
        if (porcentajeAvance > 88) porcentajeAvance = 88;

        html += `
            <div class="racer-card">
                <div class="racer-info">
                    <span class="racer-name">${idx + 1}. ${nombreCompleto} ${esMio ? '(tú)' : ''}</span>
                    <span class="racer-score">${piloto.cerrados} cerrados</span>
                </div>
                <div class="racer-track-line">
                    <div class="racer-car-icon" style="left: ${porcentajeAvance}%;">🏎️</div>
                    <div class="racer-flag-icon">🏁</div>
                </div>
            </div>
        `;
    });

    contenedor.innerHTML = html;
}
