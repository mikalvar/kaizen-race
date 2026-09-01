// --- CONFIGURACIÓN DE SUPABASE ---
const SUPABASE_URL = 'https://vmminpanvxxdczzmopua.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU';

const dbSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let usuarioLogueado = null;
let filtroIdeasActual = 'mias';
let filtroEstadoActual = 'TODOS';
let idIdeaEditando = null;

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

// --- FUNCIÓN PARA EL BOTÓN DESLIZANTE DE LOGIN / REGISTRO ---
function cambiarModoAuth(modo) {
    const sliderBg = document.getElementById('authSliderBg');
    const tabLogin = document.getElementById('tabLoginBtn');
    const tabRegister = document.getElementById('tabRegisterBtn');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    if (modo === 'login') {
        sliderBg.classList.remove('right');
        sliderBg.classList.add('left');
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    } else {
        sliderBg.classList.remove('left');
        sliderBg.classList.add('right');
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
    }
}

// --- FUNCIÓN PARA EL BOTÓN DESLIZANTE DE MIS IDEAS / TODAS ---
function cambiarFiltroIdeas(filtro) {
    filtroIdeasActual = filtro;
    filtroEstadoActual = 'TODOS';
    
    const sliderBg = document.getElementById('filterSliderBg');
    const tabMias = document.getElementById('tabMiasBtn');
    const tabTodas = document.getElementById('tabTodasBtn');

    if (filtro === 'mias') {
        sliderBg.classList.remove('right');
        sliderBg.classList.add('left');
        tabMias.classList.add('active');
        tabTodas.classList.remove('active');
    } else {
        sliderBg.classList.remove('left');
        sliderBg.classList.add('right');
        tabTodas.classList.add('active');
        tabMias.classList.remove('active');
    }
    cargarIdeas();
}

function filtrarPorEstado(estado) {
    filtroEstadoActual = estado;
    cargarIdeas();
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
    cambiarModoAuth('login');
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

async function cargarDatosApp() {
    await cargarContadores();
    await cargarIdeas();
    await cargarPista();
}

async function cargarContadores() {
    const { data: todas, error } = await dbSupabase.from('ideas').select('*');
    if (error) return;

    const total = todas.length;
    const abiertas = todas.filter(i => (i.estado || 'ABIERTO').toUpperCase() === 'ABIERTO').length;
    const cerradas = todas.filter(i => (i.estado || 'ABIERTO').toUpperCase() === 'CERRADO').length;

    document.getElementById('countTotal').textContent = total;
    document.getElementById('countAbiertas').textContent = abiertas;
    document.getElementById('countCerradas').textContent = cerradas;

    const misIdeas = todas.filter(i => i.usuario_ci === usuarioLogueado.ci);
    const misTotal = misIdeas.length;
    const misAbiertas = misIdeas.filter(i => (i.estado || 'ABIERTO').toUpperCase() === 'ABIERTO').length;
    const misCerradas = misIdeas.filter(i => (i.estado || 'ABIERTO').toUpperCase() === 'CERRADO').length;

    // Si también tienes estos elementos en tu HTML (opcional)
    if (document.getElementById('countMisTotal')) document.getElementById('countMisTotal').textContent = misTotal;
    if (document.getElementById('countMisAbiertas')) document.getElementById('countMisAbiertas').textContent = misAbiertas;
    if (document.getElementById('countMisCerradas')) document.getElementById('countMisCerradas').textContent = misCerradas;
}

function abrirModalRegistro() {
    const modal = document.getElementById('modalRegistro');
    if (modal) modal.classList.remove('hidden');
}

function cerrarModalRegistro() {
    const modal = document.getElementById('modalRegistro');
    if (modal) modal.classList.add('hidden');
}

function seleccionarTipoKaizen(tipo) {
    document.getElementById('tipo').value = tipo;
    const cardQuick = document.getElementById('cardQuick');
    const cardStandard = document.getElementById('cardStandard');

    if (tipo === 'Quick') {
        cardQuick.classList.add('selected');
        cardStandard.classList.remove('selected');
    } else {
        cardStandard.classList.add('selected');
        cardQuick.classList.remove('selected');
    }
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

    cerrarModalRegistro();
    cargarDatosApp();
    document.querySelectorAll('.nav-item')[1].click();
}

async function cargarIdeas() {
    const contenedor = document.getElementById('listaIdeas');
    contenedor.innerHTML = '<p style="text-align:center; color:#6b7280; padding: 20px;">Cargando ideas...</p>';

    let query = dbSupabase.from('ideas').select('*');
    if (filtroIdeasActual === 'mias') {
        query = query.eq('usuario_ci', usuarioLogueado.ci);
    }

    const { data: ideas, error } = await query.order('fecha_creacion', { ascending: false });

    if (error) {
        contenedor.innerHTML = '<p style="text-align:center; color:#ef4444; padding: 20px;">Error al cargar ideas.</p>';
        return;
    }

    let ideasFiltradas = ideas;
    if (filtroEstadoActual !== 'TODOS') {
        ideasFiltradas = ideas.filter(i => {
            const est = (i.estado || 'ABIERTO').toUpperCase();
            return est === filtroEstadoActual;
        });
    }

    if (!ideasFiltradas || ideasFiltradas.length === 0) {
        contenedor.innerHTML = `
            <div style="text-align:center; padding: 30px; color: var(--text-muted);">
                <span style="font-size: 32px;">📭</span>
                <h3 style="margin-top: 8px; font-size: 16px;">No hay propuestas aquí</h3>
                <p style="font-size: 13px;">No se encontraron registros con este filtro.</p>
            </div>
        `;
        return;
    }

    let html = '';
    ideasFiltradas.forEach(idea => {
        const esMio = idea.usuario_ci === usuarioLogueado.ci;
        const estado = (idea.estado || 'ABIERTO').toUpperCase();
        const badgeClass = estado === 'CERRADO' ? 'status-cerrado' : 'status-abierto';
        const nombrePiloto = idea.usuario_nombre || 'Piloto';
        const fechaFormateada = idea.fecha_creacion ? new Date(idea.fecha_creacion).toLocaleDateString() : '';

        const textoBotonEstado = estado === 'CERRADO' ? 'Abrir' : 'Cerrar';
        const colorBotonEstado = estado === 'CERRADO' ? 'var(--primary)' : 'var(--success)';
        const nuevoEstadoDestino = estado === 'CERRADO' ? 'ABIERTO' : 'CERRADO';

        html += `
            <div class="idea-card">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <span class="status-badge ${badgeClass}">${estado}</span>
                        <h3 style="margin-top: 6px; font-size: 16px; color: var(--text-main);">${idea.titulo}</h3>
                    </div>
                </div>
                <p style="margin-top: 8px; font-size: 14px; color: #4b5563;">${idea.descripcion}</p>
                <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; font-size: 12px; color: var(--text-muted);">
                    <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${idea.tipo || 'Quick'}</span>
                    <span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px;">${idea.area || 'General'}</span>
                    <span>Por: ${nombrePiloto}</span>
                    <span style="margin-left: auto;">${fechaFormateada}</span>
                </div>
                ${esMio ? `
                    <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid var(--border); padding-top: 10px;">
                        <button onclick="abrirModalEditar('${idea.id}', '${encodeURIComponent(idea.titulo)}', '${encodeURIComponent(idea.area)}', '${idea.tipo}', '${encodeURIComponent(idea.descripcion)}')" style="background-color: var(--warning); padding: 6px 12px; font-size: 12px; width: auto;">Editar</button>
                        <button onclick="cambiarEstadoIdea('${idea.id}', '${nuevoEstadoDestino}')" style="background-color: ${colorBotonEstado}; padding: 6px 12px; font-size: 12px; width: auto;">${textoBotonEstado}</button>
                        <button onclick="eliminarIdea('${idea.id}')" style="background-color: var(--danger); padding: 6px 12px; font-size: 12px; width: auto;">Eliminar</button>
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
    contenedor.innerHTML = '<p style="text-align:center; color:#6b7280; padding: 20px;">Calculando posiciones...</p>';

    const { data: usuarios, error: errUsuarios } = await dbSupabase.from('usuarios').select('*');
    const { data: ideas, error: errIdeas } = await dbSupabase.from('ideas').select('*');

    if (errUsuarios || errIdeas) {
        contenedor.innerHTML = '<p style="text-align:center; color:#ef4444; padding: 20px;">Error al cargar la pista.</p>';
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
                    <span style="color: var(--text-main);">${idx + 1}. ${nombreCompleto} ${esMio ? '(tú)' : ''}</span>
                    <span style="color: var(--primary);">${usuario.cerrados} cerrados</span>
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
