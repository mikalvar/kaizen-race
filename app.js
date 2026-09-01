// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://vmminpanvxxdczzmopua.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU';

const dbSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogueado = null;
let filtroIdeasActual = 'mias';
let idIdeaEditando = null;
let tipoKaizenSeleccionado = 'Quick';

function obtenerNombreCompleto(usuario) {
    if (!usuario) return 'Piloto Anónimo';
    let nombre = usuario.nombre || '';
    let apellido = usuario.apellido || '';
    let completo = `${nombre} ${apellido}`.replace(/null/g, '').trim();
    return completo !== '' ? completo : 'Piloto';
}

document.addEventListener('DOMContentLoaded', () => {
    const savedUser = localStorage.getItem('kaizen_user');
    if (savedUser) {
        usuarioLogueado = JSON.parse(savedUser);
        mostrarApp();
    }

    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) loginBtn.addEventListener('click', iniciarSesion);

    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) registerBtn.addEventListener('click', registrarPiloto);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', cerrarSesion);

    const guardarBtn = document.getElementById('guardarIdea');
    if (guardarBtn) guardarBtn.addEventListener('click', guardarPropuesta);

    const btnGuardarEdicion = document.getElementById('guardarEdicion');
    if (btnGuardarEdicion) btnGuardarEdicion.addEventListener('click', confirmarEdicion);

    const btnCancelarEdicion = document.getElementById('cancelarEdicion');
    if (btnCancelarEdicion) btnCancelarEdicion.addEventListener('click', cerrarModalEdicion);
});

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

async function iniciarSesion() {
    const ci = document.getElementById('ciInput').value.trim();
    if (!ci) {
        alert('Por favor ingresa tu cédula');
        return;
    }

    const { data, error } = await dbSupabase
        .from('usuarios')
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

    const { data, error } = await dbSupabase
        .from('usuarios')
        .insert([{ nombre, apellido, ci, rol: 'usuario' }])
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

async function cargarDatosApp() {
    await cargarContadores();
    await cargarIdeas();
    await cargarPista();
}

async function cargarContadores() {
    const { data: todas, error } = await dbSupabase.from('ideas').select('*');
    if (error) return;

    const total = todas.length;
    const abiertas = todas.filter(i => i.estado === 'ABIERTO' || i.estado === 'Abierto' || !i.estado).length;
    const cerradas = todas.filter(i => i.estado === 'CERRADO' || i.estado === 'Cerrado').length;

    document.getElementById('countTotal').textContent = total;
    document.getElementById('countAbiertas').textContent = abiertas;
    document.getElementById('countCerradas').textContent = cerradas;

    const misIdeas = todas.filter(i => i.usuario_ci === usuarioLogueado.ci);
    const misTotal = misIdeas.length;
    const misAbiertas = misIdeas.filter(i => i.estado === 'ABIERTO' || i.estado === 'Abierto' || !i.estado).length;
    const misCerradas = misIdeas.filter(i => i.estado === 'CERRADO' || i.estado === 'Cerrado').length;

    document.getElementById('countMisTotal').textContent = misTotal;
    document.getElementById('countMisAbiertas').textContent = misAbiertas;
    document.getElementById('countMisCerradas').textContent = misCerradas;
}

async function guardarPropuesta() {
    const titulo = document.getElementById('titulo').value.trim();
    const area = document.getElementById('area').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const tipo = document.getElementById('tipo').value;

    if (!titulo || !descripcion) {
        alert('El título y la descripción son obligatorios.');
        return;
    }

    const nombreCompleto = obtenerNombreCompleto(usuarioLogueado);

    const { error } = await dbSupabase.from('ideas').insert([{
        titulo,
        area: area || 'General',
        descripcion,
        tipo,
        estado: 'ABIERTO',
        usuario_ci: usuarioLogueado.ci,
        usuario_nombre: nombreCompleto,
        fecha_creacion: new Date().toISOString()
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
    document.querySelectorAll('.nav-item')[1].click();
}

async function cargarIdeas() {
    const contenedor = document.getElementById('listaIdeas');
    contenedor.innerHTML = '<p style="text-align:center; color:white;">Cargando ideas...</p>';

    let query = dbSupabase.from('ideas').select('*');
    if (filtroIdeasActual === 'mias') {
        query = query.eq('usuario_ci', usuarioLogueado.ci);
    }

    const { data: ideas, error } = await query.order('fecha_creacion', { ascending: false });

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
        const esMio = idea.usuario_ci === usuarioLogueado.ci;
        const estado = idea.estado || 'ABIERTO';
        const badgeClass = estado.toUpperCase() === 'CERRADO' ? 'status-cerrado' : 'status-abierto';
        const nombrePiloto = idea.usuario_nombre || 'Piloto';
        const fechaFormateada = idea.fecha_creacion ? new Date(idea.fecha_creacion).toLocaleDateString() : '';

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
                        ${estado.toUpperCase() === 'ABIERTO' ? `<button onclick="cambiarEstadoIdea('${idea.id}', 'CERRADO')" style="background-color: var(--success); padding: 6px 12px; font-size: 12px; width: auto; box-shadow: none;">Cerrar</button>` : ''}
                        <button onclick="eliminarIdea('${idea.id}')" style="background-color: var(--danger); padding: 6px 12px; font-size: 12px; width: auto; box-shadow: none;">Eliminar</button>
                    </div>
                ` : ''}
            </div>
        `;
    });

    contenedor.innerHTML = html;
}

async function cambiarEstadoIdea(id, nuevoEstado) {
    const updateData = { estado: nuevoEstado };
    if (nuevoEstado === 'CERRADO') {
        updateData.fecha_cierre = new Date().toISOString();
    }
    const { error } = await dbSupabase.from('ideas').update(updateData).eq('id', id);
    if (error) {
        alert('Error al actualizar estado');
        return;
    }
    cargarDatosApp();
}

async function eliminarIdea(id) {
    if (!confirm('¿Estás seguro de eliminar esta propuesta?')) return;
    const { error } = await dbSupabase.from('ideas').delete().eq('id', id);
    if (error) {
        alert('Error al eliminar');
        return;
    }
    cargarDatosApp();
}

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

    const { error } = await dbSupabase.from('ideas').update({
        titulo, area, tipo, descripcion
    }).eq('id', idIdeaEditando);

    if (error) {
        alert('Error al actualizar');
        return;
    }

    cerrarModalEdicion();
    cargarDatosApp();
}

async function cargarPista() {
    const contenedor = document.getElementById('pistaPilotosContainer');
    contenedor.innerHTML = '<p style="text-align:center; color:white;">Calculando posiciones...</p>';

    const { data: usuarios, error: errUsuarios } = await dbSupabase.from('usuarios').select('*');
    const { data: ideas, error: errIdeas } = await dbSupabase.from('ideas').select('*');

    if (errUsuarios || errIdeas) {
        contenedor.innerHTML = '<p style="text-align:center; color:white;">Error al cargar la pista.</p>';
        return;
    }

    let ranking = usuarios.map(usuario => {
        const cerrados = ideas.filter(i => i.usuario_ci === usuario.ci && (i.estado === 'CERRADO' || i.estado === 'Cerrado')).length;
        return {
            ...usuario,
            cerrados
        };
    });

    ranking.sort((a, b) => b.cerrados - a.cerrados);

    const indexUsuario = ranking.findIndex(u => u.ci === usuarioLogueado.ci);
    const miPosicion = indexUsuario !== -1 ? indexUsuario + 1 : 1;
    const misCerrados = indexUsuario !== -1 ? ranking[indexUsuario].cerrados : 0;

    document.getElementById('posicionTexto').textContent = `${miPosicion} / ${ranking.length}`;
    document.getElementById('misKaizensCerradosNum').textContent = misCerrados;

    const metaPista = Math.max(10, ...ranking.map(r => r.cerrados));

    let html = '';
    ranking.forEach((usuario, idx) => {
        const esMio = usuario.ci === usuarioLogueado.ci;
        const nombreCompleto = obtenerNombreCompleto(usuario);
        
        let porcentajeAvance = (usuario.cerrados / metaPista) * 85;
        if (porcentajeAvance > 88) porcentajeAvance = 88;

        html += `
            <div class="racer-card">
                <div class="racer-info">
                    <span class="racer-name">${idx + 1}. ${nombreCompleto} ${esMio ? '(tú)' : ''}</span>
                    <span class="racer-score">${usuario.cerrados} cerrados</span>
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
