// --- CONFIGURACIÓN DE SUPABASE Y ESTADO ---
const SUPABASE_URL = 'https://vmminpanvxxdczzmopua.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let usuarioActual = null;
let filtroIdeasActual = 'mias'; 
let filtroEstadoActual = 'TODOS'; 
let ideaEditandoId = null;

window.addEventListener('DOMContentLoaded', () => {
    const sesionGuardada = localStorage.getItem('kaizen_user');
    if (sesionGuardada) {
        usuarioActual = JSON.parse(sesionGuardada);
        if (usuarioActual.ci === '3992978') usuarioActual.rol = 'admin';
        mostrarAppPrincipal();
    }
});

function cambiarModoAuth(modo) {
    const slider = document.getElementById('authSliderBg');
    const btnLogin = document.getElementById('tabLoginBtn');
    const btnRegister = document.getElementById('tabRegisterBtn');
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');

    if (modo === 'login') {
        slider.className = 'auth-slider-bg left';
        btnLogin.classList.add('active');
        btnRegister.classList.remove('active');
        formLogin.classList.add('active');
        formRegister.classList.remove('active');
    } else {
        slider.className = 'auth-slider-bg right';
        btnRegister.classList.add('active');
        btnLogin.classList.remove('active');
        formRegister.classList.add('active');
        formLogin.classList.remove('active');
    }
}

document.getElementById('loginBtn')?.addEventListener('click', async () => {
    const ci = document.getElementById('ciInput').value.trim();
    if (!ci) { alert('Ingresa tu Cédula'); return; }

    try {
        const { data, error } = await supabaseClient.from('usuarios').select('*').eq('ci', ci).single();
        if (error || !data) { alert('Cédula no encontrada. Regístrate.'); return; }

        usuarioActual = data;
        if (usuarioActual.ci === '3992978') usuarioActual.rol = 'admin';
        localStorage.setItem('kaizen_user', JSON.stringify(usuarioActual));
        mostrarAppPrincipal();
    } catch (err) { console.error(err); alert('Error de conexión'); }
});

document.getElementById('registerBtn')?.addEventListener('click', async () => {
    const nombre = document.getElementById('nombreInput').value.trim();
    const apellido = document.getElementById('apellidoInput').value.trim();
    const ci = document.getElementById('ciRegistroInput').value.trim();

    if (!nombre || !apellido || !ci) { alert('Completa todos los campos'); return; }

    try {
        const rol = (ci === '3992978') ? 'admin' : 'usuario';
        const { data, error } = await supabaseClient.from('usuarios').insert([{ nombre, apellido, ci, rol }]).select().single();
        if (error) { alert('Error: ' + error.message); return; }

        usuarioActual = data;
        localStorage.setItem('kaizen_user', JSON.stringify(usuarioActual));
        mostrarAppPrincipal();
    } catch (err) { console.error(err); }
});

function cerrarSesion() {
    localStorage.removeItem('kaizen_user');
    usuarioActual = null;
    document.getElementById('appArea').classList.add('hidden');
    document.getElementById('loginArea').classList.remove('hidden');
}

function mostrarAppPrincipal() {
    document.getElementById('loginArea').classList.add('hidden');
    document.getElementById('appArea').classList.remove('hidden');
    document.getElementById('tituloPrincipalRol').textContent = "PILOTO DE MEJORA";
    document.getElementById('usuarioActual').textContent = `${usuarioActual.nombre} ${usuarioActual.apellido || ''} (${usuarioActual.ci})`;
    
    const badge = document.getElementById('roleBadge');
    if (usuarioActual.ci === '3992978' || usuarioActual.rol === 'admin') {
        badge.textContent = "Admin";
    } else {
        badge.textContent = "Usuario";
    }
    cargarDatosTablero();
}

function cambiarPestana(idTab, btn) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.getElementById(idTab).classList.add('active');
    document.querySelectorAll('.bottom-nav .nav-item').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (idTab === 'tabIdeas') cargarDatosTablero();
    else if (idTab === 'tabPista') cargarPistaCarreras();
}

function abrirModalRegistro() { document.getElementById('modalRegistro').classList.remove('hidden'); }
function cerrarModalRegistro() {
    document.getElementById('modalRegistro').classList.add('hidden');
    document.getElementById('titulo').value = '';
    document.getElementById('area').value = '';
    document.getElementById('descripcion').value = '';
    ideaEditandoId = null;
}

function seleccionarTipoKaizen(tipo) {
    document.getElementById('tipo').value = tipo;
    if (tipo === 'Quick') {
        document.getElementById('cardQuick').classList.add('selected');
        document.getElementById('cardStandard').classList.remove('selected');
    } else {
        document.getElementById('cardStandard').classList.add('selected');
        document.getElementById('cardQuick').classList.remove('selected');
    }
}

document.getElementById('guardarIdea')?.addEventListener('click', async () => {
    const titulo = document.getElementById('titulo').value.trim();
    const area = document.getElementById('area').value.trim();
    const descripcion = document.getElementById('descripcion').value.trim();
    const tipo = document.getElementById('tipo').value;

    if (!titulo || !descripcion) { alert('Completa título y descripción'); return; }

    try {
        if (ideaEditandoId) {
            await supabaseClient.from('ideas').update({ titulo, area: area || 'General', descripcion, tipo }).eq('id', ideaEditandoId);
        } else {
            await supabaseClient.from('ideas').insert([{
                titulo, area: area || 'General', descripcion, tipo, estado: 'ABIERTO',
                usuario_ci: usuarioActual.ci, usuario_nombre: `${usuarioActual.nombre} ${usuarioActual.apellido || ''}`.trim()
            }]);
        }
        cerrarModalRegistro();
        cargarDatosTablero();
    } catch (err) { console.error(err); }
});

function cambiarFiltroIdeas(filtro) {
    filtroIdeasActual = filtro;
    const slider = document.getElementById('filterSliderBg');
    if (filtro === 'mias') {
        slider.className = 'auth-slider-bg filter-slider left';
        document.getElementById('tabMiasBtn').classList.add('active');
        document.getElementById('tabTodasBtn').classList.remove('active');
    } else {
        slider.className = 'auth-slider-bg filter-slider right';
        document.getElementById('tabTodasBtn').classList.add('active');
        document.getElementById('tabMiasBtn').classList.remove('active');
    }
    cargarDatosTablero();
}

function filtrarPorEstado(estado) {
    filtroEstadoActual = estado;
    cargarDatosTablero();
}

async function cargarDatosTablero() {
    try {
        const { data, error } = await supabaseClient.from('ideas').select('*').order('fecha_creacion', { ascending: false });
        if (error) throw error;

        const misIdeas = data.filter(k => k.usuario_ci === usuarioActual.ci);
        document.getElementById('countTotal').textContent = misIdeas.length;
        document.getElementById('countAbiertas').textContent = misIdeas.filter(k => k.estado === 'ABIERTO').length;
        document.getElementById('countCerradas').textContent = misIdeas.filter(k => k.estado === 'CERRADO').length;

        let lista = filtroIdeasActual === 'mias' ? misIdeas : data;
        if (filtroEstadoActual !== 'TODOS') lista = lista.filter(k => k.estado === filtroEstadoActual);

        renderizarListaIdeas(lista);
    } catch (err) { console.error(err); }
}

function renderizarListaIdeas(ideas) {
    const contenedor = document.getElementById('listaIdeas');
    contenedor.innerHTML = '';
    if (ideas.length === 0) {
        contenedor.innerHTML = `<p style="text-align: center; color: var(--text-muted); padding: 20px;">No hay propuestas.</p>`;
        return;
    }

    ideas.forEach(k => {
        const esAdmin = (usuarioActual.ci === '3992978' || usuarioActual.rol === 'admin');
        const esPropio = (k.usuario_ci === usuarioActual.ci);
        let botones = '';
        if (esAdmin || esPropio) {
            const dest = k.estado === 'ABIERTO' ? 'CERRADO' : 'ABIERTO';
            botones = `
                <div style="display: flex; gap: 8px; margin-top: 10px; border-top: 1px solid var(--border); padding-top: 8px;">
                    <button onclick="cambiarEstadoIdea('${k.id}', '${dest}')" style="background: var(--primary-light); color: white; padding: 4px 8px; font-size: 11px; border-radius: 6px;">Cambiar a ${dest}</button>
                    <button onclick="eliminarIdea('${k.id}')" style="background: var(--danger); color: white; padding: 4px 8px; font-size: 11px; border-radius: 6px;">Eliminar</button>
                </div>`;
        }

        const card = document.createElement('div');
        card.className = 'idea-card';
        card.innerHTML = `
            <div style="display: flex; gap: 6px; margin-bottom: 6px;">
                <span class="status-badge ${k.estado === 'CERRADO' ? 'status-cerrado' : 'status-abierto'}">${k.estado}</span>
                <span class="status-badge badge-tipo">${k.tipo}</span>
            </div>
            <h4 style="margin: 0; font-size: 14px;">${k.titulo}</h4>
            <p style="font-size: 12px; color: var(--text-muted); margin: 4px 0;">${k.descripcion}</p>
            <div style="font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
                <span>Por: ${k.usuario_nombre}</span>
            </div>
            ${botones}
        `;
        contenedor.appendChild(card);
    });
}

async function cambiarEstadoIdea(id, est) {
    await supabaseClient.from('ideas').update({ estado: est, fecha_cierre: est === 'CERRADO' ? new Date() : null }).eq('id', id);
    cargarDatosTablero();
}

async function eliminarIdea(id) {
    if (!confirm('¿Eliminar propuesta?')) return;
    await supabaseClient.from('ideas').delete().eq('id', id);
    cargarDatosTablero();
}

async function cargarPistaCarreras() {
    try {
        const { data } = await supabaseClient.from('ideas').select('*');
        const ranking = {};
        data.forEach(k => {
            if (!k.usuario_ci) return;
            if (!ranking[k.usuario_ci]) ranking[k.usuario_ci] = { nombre: k.usuario_nombre, ci: k.usuario_ci, cerrados: 0 };
            if (k.estado === 'CERRADO') ranking[k.usuario_ci].cerrados++;
        });
        const arr = Object.values(ranking).sort((a, b) => b.cerrados - a.cerrados);
        const mio = arr.find(r => r.ci === usuarioActual.ci);
        document.getElementById('misKaizensCerradosNum').textContent = mio ? mio.cerrados : 0;
        document.getElementById('posicionTexto').textContent = arr.findIndex(r => r.ci === usuarioActual.ci) !== -1 ? `#${arr.findIndex(r => r.ci === usuarioActual.ci) + 1}` : '-';
        
        const cont = document.getElementById('pistaPilotosContainer');
        cont.innerHTML = '';
        arr.forEach((p, i) => {
            cont.innerHTML += `<div class="racer-card" style="padding: 10px; margin-bottom: 8px; border: 1px solid var(--border); border-radius: 8px;">#${i+1} ${p.nombre} - <b>${p.cerrados} Cerrados</b></div>`;
        });
    } catch(e) { console.error(e); }
}
