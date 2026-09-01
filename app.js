const SUPABASE_URL = "https://vmminpanvxxdczzmopua.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let filtroIdeasActual = 'mias'; // 'mias' por defecto en la pestaña Mis Ideas
let ideasGlobales = [];
let editIdActual = null;

// Validar sesión al cargar
window.addEventListener('DOMContentLoaded', () => {
    const sesionGuardada = sessionStorage.getItem("usuario");
    if (sesionGuardada) {
        currentUser = JSON.parse(sesionGuardada);
        document.getElementById("loginArea").classList.add("hidden");
        document.getElementById("appArea").classList.remove("hidden");
        document.getElementById("usuarioActual").textContent = `${currentUser.nombre} ${currentUser.apellido || ""}`.toUpperCase();
        cargarIdeas();
    }
});

/* =================================
   CONTROL DE PESTAÑAS (INFERIOR)
================================= */
function cambiarPestana(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');
}

/* =================================
   SELECTOR TIPO KAIZEN (UI)
================================= */
function seleccionarTipoKaizen(tipo) {
    document.getElementById("tipo").value = tipo;
    if (tipo === 'Quick') {
        document.getElementById("typeQuickCard").classList.add("selected");
        document.getElementById("typeStandardCard").classList.remove("selected");
    } else {
        document.getElementById("typeStandardCard").classList.add("selected");
        document.getElementById("typeQuickCard").classList.remove("selected");
    }
}

/* =================================
   REGISTRO
================================= */
async function registrarUsuario() {
    const nombre = document.getElementById("nombreInput").value.trim();
    const apellido = document.getElementById("apellidoInput").value.trim();
    const ci = document.getElementById("ciRegistroInput").value.trim();

    if (!nombre || !apellido || !ci) {
        alert("Completa nombre, apellido y cédula");
        return;
    }

    const { error } = await supabaseClient.from("usuarios").insert([{ nombre, apellido, ci, rol: "usuario" }]);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Piloto registrado correctamente. Ahora puedes iniciar sesión.");
    document.getElementById("nombreInput").value = "";
    document.getElementById("apellidoInput").value = "";
    document.getElementById("ciRegistroInput").value = "";
}

/* =================================
   LOGIN
================================= */
async function loginUsuario() {
    const ci = document.getElementById("ciInput").value.trim();

    if (!ci) {
        alert("Ingresa tu cédula");
        return;
    }

    const { data, error } = await supabaseClient
        .from("usuarios")
        .select("*")
        .eq("ci", ci)
        .single();

    if (error || !data) {
        alert("Usuario no encontrado");
        return;
    }

    currentUser = data;
    sessionStorage.setItem("usuario", JSON.stringify(data));

    document.getElementById("loginArea").classList.add("hidden");
    document.getElementById("appArea").classList.remove("hidden");
    document.getElementById("usuarioActual").textContent = `${data.nombre} ${data.apellido || ""}`.toUpperCase();

    cargarIdeas();
}

/* =================================
   LOGOUT
================================= */
function logoutUsuario() {
    currentUser = null;
    sessionStorage.removeItem("usuario");
    document.getElementById("loginArea").classList.remove("hidden");
    document.getElementById("appArea").classList.add("hidden");
}

/* =================================
   CREAR IDEA
================================= */
async function guardarIdea() {
    const titulo = document.getElementById("titulo").value.trim();
    const area = document.getElementById("area").value.trim() || "General";
    const tipo = document.getElementById("tipo").value;
    const descripcion = document.getElementById("descripcion").value.trim();

    const usuario = JSON.parse(sessionStorage.getItem("usuario"));

    if (!titulo || !descripcion) {
        alert("Completa al menos el título y la descripción");
        return;
    }

    const { error } = await supabaseClient.from("ideas").insert([
        {
            titulo,
            descripcion,
            area,
            tipo,
            estado: "ABIERTO",
            usuario_ci: usuario.ci,
            usuario_nombre: `${usuario.nombre} ${usuario.apellido || ""}`.trim(),
            fecha_creacion: new Date().toISOString()
        }
    ]);

    if (error) {
        alert(error.message);
        return;
    }

    alert("¡Propuesta registrada con éxito!");
    document.getElementById("titulo").value = "";
    document.getElementById("area").value = "";
    document.getElementById("descripcion").value = "";

    // Cambiar automáticamente a la pestaña Mis Ideas para ver la propuesta recién creada
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
    document.getElementById('tabMisIdeas').classList.add('active');
    // Seleccionar el segundo botón del nav (Mis ideas)
    document.querySelectorAll('.nav-item')[1].classList.add('active');

    cargarIdeas();
}

/* =================================
   CARGAR Y RENDERIZAR IDEAS
================================= */
async function cargarIdeas() {
    const { data, error } = await supabaseClient
        .from("ideas")
        .select("*")
        .order("fecha_creacion", { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    ideasGlobales = data || [];
    actualizarContadoresGenerales(ideasGlobales);
    renderizarIdeas();
    actualizarPistaYRanking(ideasGlobales);
}

function actualizarContadoresGenerales(ideas) {
    const total = ideas.length;
    const abiertas = ideas.filter(i => i.estado === "ABIERTO").length;
    const cerradas = ideas.filter(i => i.estado === "CERRADO").length;

    // Contadores de la pestaña Registrar
    document.getElementById("countTotal").textContent = total;
    document.getElementById("countAbiertas").textContent = abiertas;
    document.getElementById("countCerradas").textContent = cerradas;

    // Contadores de la pestaña Mis Ideas (filtrados por el usuario actual)
    if (currentUser) {
        const misIdeas = ideas.filter(i => i.usuario_ci === currentUser.ci);
        document.getElementById("countMisTotal").textContent = misIdeas.length;
        document.getElementById("countMisAbiertas").textContent = misIdeas.filter(i => i.estado === "ABIERTO").length;
        document.getElementById("countMisCerradas").textContent = misIdeas.filter(i => i.estado === "CERRADO").length;
    }
}

function cambiarFiltroIdeas(filtro) {
    filtroIdeasActual = filtro;
    if (filtro === 'mias') {
        document.getElementById("btnFiltroMias").classList.add("active");
        document.getElementById("btnFiltroTodas").classList.remove("active");
    } else {
        document.getElementById("btnFiltroTodas").classList.add("active");
        document.getElementById("btnFiltroMias").classList.remove("active");
    }
    renderizarIdeas();
}

function renderizarIdeas() {
    const lista = document.getElementById("listaIdeas");
    lista.innerHTML = "";

    let ideasAMostrar = ideasGlobales;
    if (filtroIdeasActual === 'mias' && currentUser) {
        ideasAMostrar = ideasGlobales.filter(idea => idea.usuario_ci === currentUser.ci);
    }

    if (ideasAMostrar.length === 0) {
        lista.innerHTML = `<div class="idea-card" style="text-align: center; color: #64748b;">No hay propuestas para mostrar en esta vista.</div>`;
        return;
    }

    ideasAMostrar.forEach(idea => {
        const card = document.createElement("div");
        card.className = "idea-card";

        const esAdmin = currentUser && currentUser.rol === "admin";
        const esDueno = currentUser && idea.usuario_ci === currentUser.ci;
        const estaCerrado = idea.estado === "CERRADO";

        // Formatear fecha
        let fechaFormateada = "";
        if (idea.fecha_creacion) {
            const fechaObj = new Date(idea.fecha_creacion);
            fechaFormateada = fechaObj.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        card.innerHTML = `
            <div class="idea-card-header">
                <h3>${idea.titulo}</h3>
                <span class="status-badge ${estaCerrado ? 'status-cerrado' : 'status-abierto'}">
                    • ${idea.estado}
                </span>
            </div>
            <p>${idea.descripcion}</p>
            <div class="idea-tags">
                <span class="tag-type">${idea.tipo}</span>
                <span class="tag-meta">${idea.area || 'General'}</span>
                <span style="font-size: 11px; color: #64748b; margin-left: 6px;">Por: ${idea.usuario_nombre || 'Piloto'}</span>
                <span class="idea-date">${fechaFormateada}</span>
            </div>
            ${
                esAdmin || esDueno
                ? `
                <div style="display: flex; gap: 8px; margin-top: 12px; border-top: 1px solid #f1f5f9; paddingTop: 10px;">
                    <button onclick="abrirModalEditar(${idea.id})" style="background: #f59e0b; padding: 6px 12px; font-size: 12px; width: auto;">Editar</button>
                    ${!estaCerrado ? `<button onclick="cerrarIdea(${idea.id})" style="background: #0284c7; padding: 6px 12px; font-size: 12px; width: auto;">Cerrar</button>` : ''}
                    <button onclick="eliminarIdea(${idea.id})" style="background: #ef4444; padding: 6px 12px; font-size: 12px; width: auto;">Eliminar</button>
                </div>
                `
                : ""
            }
        `;
        lista.appendChild(card);
    });
}

/* =================================
   ACCIONES SOBRE IDEAS
================================= */
async function cerrarIdea(id) {
    if (!confirm("¿Deseas cerrar esta propuesta?")) return;

    const { error } = await supabaseClient
        .from("ideas")
        .update({ estado: "CERRADO", fecha_cierre: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }
    cargarIdeas();
}

async function eliminarIdea(id) {
    if (!confirm("¿Deseas eliminar esta propuesta?")) return;

    const { error } = await supabaseClient.from("ideas").delete().eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }
    cargarIdeas();
}

function abrirModalEditar(id) {
    const idea = ideasGlobales.find(i => i.id === id);
    if (!idea) return;

    editIdActual = id;
    document.getElementById("editTitulo").value = idea.titulo;
    document.getElementById("editArea").value = idea.area;
    document.getElementById("editTipo").value = idea.tipo;
    document.getElementById("editDescripcion").value = idea.descripcion;

    document.getElementById("editModal").classList.remove("hidden");
}

document.getElementById("cancelarEdicion").addEventListener("click", () => {
    document.getElementById("editModal").classList.add("hidden");
});

document.getElementById("guardarEdicion").addEventListener("click", async () => {
    const nuevoTitulo = document.getElementById("editTitulo").value.trim();
    const nuevaArea = document.getElementById("editArea").value.trim();
    const nuevoTipo = document.getElementById("editTipo").value;
    const nuevaDescripcion = document.getElementById("editDescripcion").value.trim();

    if (!nuevoTitulo || !nuevaDescripcion) {
        alert("Completa el título y la descripción");
        return;
    }

    const { error } = await supabaseClient
        .from("ideas")
        .update({ titulo: nuevoTitulo, area: nuevaArea, tipo: nuevoTipo, descripcion: nuevaDescripcion })
        .eq("id", editIdActual);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Propuesta actualizada correctamente");
    document.getElementById("editModal").classList.add("hidden");
    cargarIdeas();
});

/* =================================
   VISTA PISTA Y RANKING
================================= */
function actualizarPistaYRanking(ideas) {
    // Agrupar kaizents cerrados por usuario (puntos: Standard = 3 pts o cerrados totales)
    const ranking = {};

    ideas.forEach(idea => {
        if (idea.estado !== "CERRADO") return;
        const nombre = idea.usuario_nombre || "Sin nombre";
        const puntos = idea.tipo === "Standard" ? 3 : 1;
        ranking[nombre] = (ranking[nombre] || 0) + puntos;
    });

    // Si el usuario actual no tiene cerrados pero está logueado, asegurarlo en la lista con 0
    if (currentUser) {
        const nombreCompleto = `${currentUser.nombre} ${currentUser.apellido || ""}`.trim();
        if (!ranking[nombreCompleto]) {
            // Buscar si hay alguno por nombre parcial
            const encontrado = Object.keys(ranking).some(k => k.toLowerCase().includes(currentUser.nombre.toLowerCase()));
            if (!encontrado && Object.keys(ranking).length === 0) {
                // Inicializar vacío si nadie tiene cerrados
            }
        }
    }

    // Convertir a array y ordenar por puntos descendente
    const pilotosOrdenados = Object.entries(ranking).sort((a, b) => b[1] - a[1]);

    // Si no hay ningún cerrado registrado en absoluto, mostrar al usuario actual con 0
    if (pilotosOrdenados.length === 0 && currentUser) {
        const nombreCompleto = `${currentUser.nombre} ${currentUser.apellido || ""}`.trim();
        pilotosOrdenados.push([nombreCompleto, 0]);
    }

    // Calcular kaizens cerrados del usuario actual para la tarjeta superior de pista
    let misCerradosCount = 0;
    if (currentUser) {
        const nombreActual = `${currentUser.nombre} ${currentUser.apellido || ""}`.trim().toLowerCase();
        ideas.forEach(i => {
            if (i.usuario_ci === currentUser.ci && i.estado === "CERRADO") {
                misCerradosCount++;
            }
        });
    }
    document.getElementById("misKaizensCerradosNum").textContent = misCerradosCount;

    // Encontrar posición del usuario actual
    let miPosicion = 1;
    if (currentUser) {
        const nombreActual = `${currentUser.nombre} ${currentUser.apellido || ""}`.trim();
        const indexUser = pilotosOrdenados.findIndex(p => p[0].toLowerCase() === nombreActual.toLowerCase());
        if (indexUser !== -1) {
            miPosicion = indexUser + 1;
        }
    }
    document.getElementById("posicionTexto").textContent = `${miPosicion} / ${Math.max(pilotosOrdenados.length, 1)}`;

    // Renderizar tarjetas de la pista
    const container = document.getElementById("pistaPilotosContainer");
    container.innerHTML = "";

    pilotosOrdenados.forEach((piloto, index) => {
        const nombrePiloto = piloto[0];
        const cerradosCount = piloto[1];
        const esUserActual = currentUser && nombrePiloto.toLowerCase().includes(currentUser.nombre.toLowerCase());

        const racerCard = document.createElement("div");
        racerCard.className = "racer-card";

        // Calcular posición visual del auto en la línea punteada (máximo 80% para que no pase la bandera)
        let carPositionPercent = Math.min(10 + (cerradosCount * 25), 78);

        racerCard.innerHTML = `
            <div class="racer-info">
                <span class="racer-name">${index + 1}. ${nombrePiloto} ${esUserActual ? '<span style="color:#0284c7; font-weight:normal;">(tú)</span>' : ''}</span>
                <span class="racer-score"><b>${cerradosCount}</b> cerrados</span>
            </div>
            <div class="racer-track-line">
                <span class="racer-car-icon" style="left: ${carPositionPercent}%;">🏎️</span>
                <span class="racer-flag-icon">🏁</span>
            </div>
        `;
        container.appendChild(racerCard);
    });
}

/* =================================
   EVENTOS PRINCIPALES
================================= */
document.getElementById("registerBtn").addEventListener("click", registrarUsuario);
document.getElementById("loginBtn").addEventListener("click", loginUsuario);
document.getElementById("logoutBtn").addEventListener("click", logoutUsuario);
document.getElementById("guardarIdea").addEventListener("click", guardarIdea);
