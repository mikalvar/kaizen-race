const SUPABASE_URL = "https://vmminpanvxxdczzmopua.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtbWlucGFudnh4ZGN6em1vcHVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyNzU1MDQsImV4cCI6MjEwMzg1MTUwNH0.K3eWFErUjf3_VhZ8Jr7ZID3NnHp7vM8kwZZFwNoRaiU";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let filtroActual = 'todas'; // 'todas' o 'mias'
let ideasGlobales = [];
let editIdActual = null;

// Validar sesión persistente al cargar
window.addEventListener('DOMContentLoaded', () => {
    const sesionGuardada = sessionStorage.getItem("usuario");
    if (sesionGuardada) {
        currentUser = JSON.parse(sesionGuardada);
        document.getElementById("loginArea").classList.add("hidden");
        document.getElementById("appArea").classList.remove("hidden");
        document.getElementById("usuarioActual").textContent = `${currentUser.nombre} ${currentUser.apellido || ""}`;
        cargarIdeas();
    }
});

/* =================================
   CONTROL DE PESTAÑAS
================================= */
function cambiarPestana(tabId, btnElement) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    btnElement.classList.add('active');
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

    alert("Usuario registrado correctamente. Ahora puedes iniciar sesión.");
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
    document.getElementById("usuarioActual").textContent = `${data.nombre} ${data.apellido || ""}`;

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
    const area = document.getElementById("area").value.trim();
    const tipo = document.getElementById("tipo").value;
    const descripcion = document.getElementById("descripcion").value.trim();

    const usuario = JSON.parse(sessionStorage.getItem("usuario"));

    if (!titulo || !area || !descripcion) {
        alert("Completa todos los campos");
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

    alert("Idea registrada con éxito");
    document.getElementById("titulo").value = "";
    document.getElementById("area").value = "";
    document.getElementById("descripcion").value = "";

    cargarIdeas();
}

/* =================================
   LISTAR IDEAS Y FILTROS
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
    renderizarIdeasFiltradas();
    actualizarDashboard(ideasGlobales);
    cargarRanking(ideasGlobales);
}

function filtrarIdeas(tipoFiltro) {
    filtroActual = tipoFiltro;
    document.getElementById("filterTodas").classList.toggle("active", tipoFiltro === 'todas');
    document.getElementById("filterMis").classList.toggle("active", tipoFiltro === 'mias');
    renderizarIdeasFiltradas();
}

function renderizarIdeasFiltradas() {
    const lista = document.getElementById("listaIdeas");
    lista.innerHTML = "";

    let ideasAMostrar = ideasGlobales;
    if (filtroActual === 'mias' && currentUser) {
        ideasAMostrar = ideasGlobales.filter(idea => idea.usuario_ci === currentUser.ci);
    }

    if (ideasAMostrar.length === 0) {
        lista.innerHTML = `<div class="card" style="text-align: center; color: #64748b;">No hay ideas para mostrar en este filtro.</div>`;
        return;
    }

    ideasAMostrar.forEach(idea => {
        const card = document.createElement("div");
        card.className = "card";

        const esAdmin = currentUser && currentUser.rol === "admin";
        // Permitir también editar/cerrar si el usuario actual es el autor dueño de la idea
        const esDueno = currentUser && idea.usuario_ci === currentUser.ci;

        card.innerHTML = `
            <h3 style="margin-top:0; color: #1e293b;">${idea.titulo}</h3>
            <p><b>Área:</b> ${idea.area}</p>
            <p><b>Tipo:</b> ${idea.tipo}</p>
            <p><b>Estado:</b> <span style="color: ${idea.estado === 'ABIERTO' ? '#16a34a' : '#dc2626'}">${idea.estado}</span></p>
            <p><b>Autor:</b> ${idea.usuario_nombre || "Sin nombre"}</p>
            <p style="background: #f8fafc; padding: 10px; border-radius: 6px;">${idea.descripcion}</p>
            ${
                esAdmin || esDueno
                ? `
                <div style="display: flex; gap: 8px; margin-top: 10px;">
                    <button onclick="abrirModalEditar(${idea.id})" style="background: #f59e0b; padding: 6px 12px; font-size: 13px;">Editar</button>
                    ${idea.estado !== 'CERRADO' ? `<button onclick="cerrarIdea(${idea.id})" style="background: #0284c7; padding: 6px 12px; font-size: 13px;">Cerrar</button>` : ''}
                    <button onclick="eliminarIdea(${idea.id})" style="background: #ef4444; padding: 6px 12px; font-size: 13px;">Eliminar</button>
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
    if (!confirm("¿Deseas cerrar esta idea?")) return;

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
    if (!confirm("¿Deseas eliminar esta idea?")) return;

    const { error } = await supabaseClient.from("ideas").delete().eq("id", id);

    if (error) {
        alert(error.message);
        return;
    }
    cargarIdeas();
}

// Modal de Edición visual integrado
async function abrirModalEditar(id) {
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

    if (!nuevoTitulo || !nuevaArea || !nuevaDescripcion) {
        alert("Completa todos los campos");
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

    alert("Idea actualizada correctamente");
    document.getElementById("editModal").classList.add("hidden");
    cargarIdeas();
});

/* =================================
   DASHBOARD & RANKING
================================= */
function actualizarDashboard(ideas) {
    const total = ideas.length;
    const quick = ideas.filter(i => i.tipo === "Quick").length;
    const standard = ideas.filter(i => i.tipo === "Standard").length;
    const abiertas = ideas.filter(i => i.estado === "ABIERTO").length;
    const cerradas = ideas.filter(i => i.estado === "CERRADO").length;

    // Puntos: Standard = 3 pts, Quick = 1 pt (solo ideas cerradas)
    let puntosTotales = 0;
    ideas.forEach(i => {
        if (i.estado === "CERRADO") {
            puntosTotales += (i.tipo === "Standard" ? 3 : 1);
        }
    });

    document.getElementById("dashTotal").textContent = total;
    document.getElementById("dashQuick").textContent = quick;
    document.getElementById("dashStandard").textContent = standard;
    document.getElementById("dashAbiertas").textContent = abiertas;
    document.getElementById("dashCerradas").textContent = cerradas;
    document.getElementById("dashPuntos").textContent = puntosTotales;
}

function cargarRanking(ideas) {
    const ranking = {};

    ideas.forEach(idea => {
        if (idea.estado !== "CERRADO") return;
        const nombre = idea.usuario_nombre || "Sin nombre";
        const puntos = idea.tipo === "Standard" ? 3 : 1;
        ranking[nombre] = (ranking[nombre] || 0) + puntos;
    });

    const resultado = Object.entries(ranking).sort((a, b) => b[1] - a[1]);
    const contenedor = document.getElementById("ranking");

    if (!resultado.length) {
        contenedor.innerHTML = `<div class="card" style="text-align: center; color: #64748b;">No hay ideas cerradas todavía para puntuar en el ranking.</div>`;
        return;
    }

    contenedor.innerHTML = resultado.map((item, index) => `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
            <div>
                <span style="font-size: 18px; margin-right: 10px;">🏆</span>
                <b>${index + 1}. ${item[0]}</b>
            </div>
            <span style="background: #eff6ff; color: var(--primary); padding: 4px 10px; border-radius: 20px; font-weight: bold;">${item[1]} pts</span>
        </div>
    `).join("");
}

/* =================================
   EVENTOS PRINCIPALES
================================= */
document.getElementById("registerBtn").addEventListener("click", registrarUsuario);
document.getElementById("loginBtn").addEventListener("click", loginUsuario);
document.getElementById("logoutBtn").addEventListener("click", logoutUsuario);
document.getElementById("guardarIdea").addEventListener("click", guardarIdea);
