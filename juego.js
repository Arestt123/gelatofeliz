const canvas = document.getElementById("juego");
const ctx = canvas.getContext("2d");

const teclas = {};
const jugador = {
  id: null,
  x: 470,
  y: 430,
  ancho: 25,
  alto: 29,
  velocidad: 3,
  color: "#e85d8f",
  nombre: "",
  labor: "",
  imagen: "",
  tieneHelado: false,
  pedidoHelado: null,
  mesaAsignadaId: null
};

// Muebles y objetos que bloquean el paso (ajustados a local.jpeg en 960x540).
const obstaculos = [
  { x: 280, y: 140, w: 465, h: 95  }, // 0: Mostrador + vitrina de helados
  { x: 135, y: 205, w: 85,  h: 95  }, // 1: Mesa 1 (superior izquierda)
  { x: 135, y: 345, w: 85,  h: 95  }, // 2: Mesa 2 (inferior izquierda)
  { x: 255, y: 345, w: 85,  h: 95  }, // 3: Mesa 3 (inferior centro-izquierda)
  { x: 525, y: 265, w: 115, h: 90  }, // 4: Mesa 4 (central)
  { x: 725, y: 310, w: 120, h: 95  }  // 5: Mesa 5 (derecha)
];

// Configuración de las 5 mesas y su punto donde el jugador puede entregar el pedido.
const MESAS = [
  { id: 1, nombre: "Mesa 1", x: 135, y: 205, w: 85,  h: 95, entregaX: 245, entregaY: 252, cliente: null },
  { id: 2, nombre: "Mesa 2", x: 135, y: 345, w: 85,  h: 95, entregaX: 245, entregaY: 392, cliente: null },
  { id: 3, nombre: "Mesa 3", x: 255, y: 345, w: 85,  h: 95, entregaX: 365, entregaY: 392, cliente: null },
  { id: 4, nombre: "Mesa 4", x: 525, y: 265, w: 115, h: 90, entregaX: 582, entregaY: 380, cliente: null },
  { id: 5, nombre: "Mesa 5", x: 725, y: 310, w: 120, h: 95, entregaX: 785, entregaY: 430, cliente: null }
];

const SABORES = [
  { nombre: "Fresa",     color: "#f47da7" },
  { nombre: "Vainilla",  color: "#fff1c9" },
  { nombre: "Pistacho",  color: "#a9d58c" },
  { nombre: "Chocolate", color: "#8d5843" }
];

const FORMATOS = [
  { id: "vaso", nombre: "Vaso morado" },
  { id: "cono", nombre: "Cono" },
  { id: "copa", nombre: "Copa" }
];

const NOMBRES_CLIENTES = ["Sofía", "Mateo", "Valentina", "Lucas", "Camila", "Sebastián", "Isabella", "Diego"];
const COLORES_CLIENTES = ["#ff8fab", "#72efdd", "#ffd166", "#cdb4db", "#90be6d", "#f9c74f"];
const COLORES_CABELLO = ["#3b2720", "#6f4528", "#d4a359", "#1f1f24", "#8c3b2b"];

// Lista de los 9 personajes.
const PERSONAJES = [
  { id: 1, nombre: "Keren",    labor: "Mesera",       categoria: "Mesera/o",     color: "#e85d8f", imagen: "img/kerenn.png" },
  { id: 2, nombre: "Karol",    labor: "Cocina",       categoria: "Cocina",       color: "#f5b041", imagen: "img/karoll.png" },
  { id: 3, nombre: "Zurita",   labor: "Mesero",       categoria: "Mesera/o",     color: "#5dade2", imagen: "img/zuritaaa.png" },
  { id: 4, nombre: "Aress",    labor: "Domiciliario", categoria: "Domiciliario", color: "#48c9b0", imagen: "img/aress.png" },
  { id: 5, nombre: "Jeiner",   labor: "Domiciliario", categoria: "Domiciliario", color: "#52be80", imagen: "img/jeinerr.png" },
  { id: 6, nombre: "Thaliana", labor: "Cocina",       categoria: "Cocina",       color: "#f4d03f", imagen: "img/thaliana.png" },
  { id: 7, nombre: "Karla",    labor: "Mesera",       categoria: "Mesera/o",     color: "#ec7063", imagen: "img/karlaa.png" },
  { id: 8, nombre: "Majo",     labor: "Cocina",       categoria: "Cocina",       color: "#af7ac5", imagen: "img/majo.png" },
  { id: 9, nombre: "Jeissy",   labor: "Mesera",       categoria: "Mesera/o",     color: "#f1948a", imagen: "img/jeissy.png" }
];

// Precarga de imágenes de personajes y fondo del local.
const imagenesCargadas = {};
PERSONAJES.forEach((personaje) => {
  if (personaje.imagen) {
    const img = new Image();
    img.src = personaje.imagen;
    imagenesCargadas[personaje.id] = img;
  }
});

const RUTA_FONDO_LOCAL = "img/local.jpeg";
const imagenFondo = new Image();
imagenFondo.src = RUTA_FONDO_LOCAL;

// Estado del servicio y pedidos.
let personajeElegido = null;
let juegoIniciado = false;
let heladoEnMostrador = true;
let pedidoMostrador = { sabor: SABORES[0], formato: FORMATOS[0] };
let tiempoReposicionMostrador = 0;
let tiempoSiguienteCliente = 1.5;
let puntuacion = 0;
let avisoBanner = "Esperando clientes... Acércate al mostrador y pulsa E para tomar helado.";
let ultimoFrame = performance.now();

const clientes = [];

const gridPersonajes = document.getElementById("grid-personajes");
const infoSeleccionado = document.getElementById("info-seleccionado");
const btnJugar = document.getElementById("btn-jugar");
const botonesFiltro = document.querySelectorAll(".btn-filtro");
const pantallaSeleccion = document.getElementById("pantalla-seleccion");
const zonaJuego = document.getElementById("zona-juego");

function obtenerClaseRol(categoria) {
  if (categoria === "Cocina") return "rol-cocina";
  if (categoria === "Domiciliario") return "rol-domiciliario";
  return "rol-mesero";
}

function renderizarPersonajes(filtro = "Todos") {
  if (!gridPersonajes) return;
  gridPersonajes.innerHTML = "";

  const filtrados = filtro === "Todos"
    ? PERSONAJES
    : PERSONAJES.filter((p) => p.categoria === filtro);

  filtrados.forEach((personaje) => {
    const tarjeta = document.createElement("div");
    tarjeta.className = "tarjeta-personaje";
    if (personajeElegido && personajeElegido.id === personaje.id) {
      tarjeta.classList.add("seleccionado");
    }

    const contenidoAvatar = personaje.imagen
      ? `<img src="${personaje.imagen}" alt="${personaje.nombre}" onerror="this.parentElement.innerHTML='<span class=\\'avatar-placeholder\\'>${personaje.nombre[0]}</span>'">`
      : `<span class="avatar-placeholder">${personaje.nombre[0]}</span>`;

    tarjeta.innerHTML = `
      <div class="avatar-contenedor" style="border-color: ${personaje.color}">
        ${contenidoAvatar}
      </div>
      <div class="datos-personaje">
        <h3>${personaje.nombre}</h3>
        <span class="badge-rol ${obtenerClaseRol(personaje.categoria)}">
          ${personaje.labor}
        </span>
      </div>
    `;

    tarjeta.addEventListener("click", () => {
      personajeElegido = personaje;
      infoSeleccionado.innerHTML = `Elegiste a <b>${personaje.nombre}</b> • Rol: <b>${personaje.labor}</b>`;
      btnJugar.disabled = false;
      renderizarPersonajes(filtro);
    });

    gridPersonajes.appendChild(tarjeta);
  });
}

botonesFiltro.forEach((btn) => {
  btn.addEventListener("click", () => {
    botonesFiltro.forEach((b) => b.classList.remove("activo"));
    btn.classList.add("activo");
    renderizarPersonajes(btn.dataset.rol);
  });
});

btnJugar.addEventListener("click", () => {
  if (!personajeElegido) return;

  jugador.id = personajeElegido.id;
  jugador.nombre = personajeElegido.nombre;
  jugador.labor = personajeElegido.labor;
  jugador.color = personajeElegido.color;
  jugador.imagen = personajeElegido.imagen;

  pantallaSeleccion.classList.add("oculto");
  zonaJuego.classList.remove("oculto");

  document.getElementById("subtitulo").textContent = `Jugando con ${personajeElegido.nombre} (${personajeElegido.labor})`;
  document.getElementById("indicador-estado").innerHTML = `DÍA 1 <span>•</span> ${personajeElegido.labor.toUpperCase()}`;
  document.getElementById("texto-footer").textContent = `WASD/Flechas mover • E recoger/entregar • Turno de ${personajeElegido.nombre}`;

  if (personajeElegido.categoria === "Domiciliario") {
    if (typeof iniciarModoDomicilios === "function") {
      iniciarModoDomicilios(personajeElegido);
    }
    return;
  }

  if (!juegoIniciado) {
    juegoIniciado = true;
    ultimoFrame = performance.now();
    crearCliente();
    bucle(ultimoFrame);
  }
});

function distancia(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function cercaDelMostrador() {
  const centroJugadorX = jugador.x + jugador.ancho / 2;
  const centroJugadorY = jugador.y + jugador.alto / 2;
  const clampX = Math.max(280, Math.min(centroJugadorX, 745));
  const clampY = Math.max(140, Math.min(centroJugadorY, 235));
  return distancia(centroJugadorX, centroJugadorY, clampX, clampY) <= 58;
}

function mesaCercanaParaEntregar() {
  const centroJugadorX = jugador.x + jugador.ancho / 2;
  const centroJugadorY = jugador.y + jugador.alto / 2;

  return MESAS.find((mesa) => {
    const dEntrega = distancia(centroJugadorX, centroJugadorY, mesa.entregaX, mesa.entregaY);
    const centroMesaX = mesa.x + mesa.w / 2;
    const centroMesaY = mesa.y + mesa.h / 2;
    const dCentro = distancia(centroJugadorX, centroJugadorY, centroMesaX, centroMesaY);
    return dEntrega <= 65 || dCentro <= 85;
  });
}

function crearPedidoAleatorio() {
  return {
    sabor: SABORES[Math.floor(Math.random() * SABORES.length)],
    formato: FORMATOS[Math.floor(Math.random() * FORMATOS.length)]
  };
}

function crearCliente() {
  const mesasLibres = MESAS.filter((m) => m.cliente === null);
  if (mesasLibres.length === 0) return;

  const mesaElegida = mesasLibres[Math.floor(Math.random() * mesasLibres.length)];
  const pedido = crearPedidoAleatorio();
  const nombre = NOMBRES_CLIENTES[Math.floor(Math.random() * NOMBRES_CLIENTES.length)];
  const color = COLORES_CLIENTES[Math.floor(Math.random() * COLORES_CLIENTES.length)];
  const cabello = COLORES_CABELLO[Math.floor(Math.random() * COLORES_CABELLO.length)];

  const cliente = {
    id: Date.now() + Math.random(),
    nombre,
    color,
    cabello,
    x: 480,
    y: 515,
    objetivoX: mesaElegida.entregaX,
    objetivoY: mesaElegida.entregaY,
    mesaId: mesaElegida.id,
    estado: "caminando",
    pedido,
    tiempoSalida: 0
  };

  mesaElegida.cliente = cliente;
  clientes.push(cliente);

  if (!jugador.tieneHelado) {
    avisoBanner = `${cliente.nombre} está en la ${mesaElegida.nombre} y pide ${pedido.formato.nombre.toLowerCase()} de ${pedido.sabor.nombre}. ¡Ve al mostrador (E)!`;
  }
}

function interactuarConTeclaE() {
  if (!jugador.tieneHelado && cercaDelMostrador()) {
    if (!heladoEnMostrador) {
      avisoBanner = "Aún se está preparando otro helado en el mostrador...";
      return;
    }

    const clienteEsperando = clientes.find((c) => c.estado === "esperando");
    jugador.tieneHelado = true;
    jugador.pedidoHelado = clienteEsperando ? clienteEsperando.pedido : pedidoMostrador;
    jugador.mesaAsignadaId = clienteEsperando ? clienteEsperando.mesaId : null;
    heladoEnMostrador = false;
    tiempoReposicionMostrador = 2.0;

    if (jugador.mesaAsignadaId) {
      avisoBanner = `¡Tienes ${jugador.pedidoHelado.formato.nombre.toLowerCase()} de ${jugador.pedidoHelado.sabor.nombre}! Llévalo a la Mesa ${jugador.mesaAsignadaId}.`;
    } else {
      avisoBanner = `¡Tienes ${jugador.pedidoHelado.formato.nombre.toLowerCase()} de ${jugador.pedidoHelado.sabor.nombre}! Llévalo a una mesa con cliente.`;
    }
    return;
  }

  if (jugador.tieneHelado) {
    const mesa = mesaCercanaParaEntregar();
    if (!mesa) {
      avisoBanner = jugador.mesaAsignadaId
        ? `Acércate a la Mesa ${jugador.mesaAsignadaId} y pulsa E para entregar el pedido.`
        : "Acércate a una mesa con cliente y pulsa E para entregar el pedido.";
      return;
    }

    if (!mesa.cliente || mesa.cliente.estado !== "esperando") {
      avisoBanner = `La ${mesa.nombre} no tiene un cliente esperando pedido ahora.`;
      return;
    }

    const clienteAtendido = mesa.cliente;
    clienteAtendido.estado = "satisfecho";
    clienteAtendido.tiempoSalida = 1.6;
    puntuacion += 100;

    jugador.tieneHelado = false;
    jugador.pedidoHelado = null;
    jugador.mesaAsignadaId = null;

    avisoBanner = `¡Pedido entregado en ${mesa.nombre} a ${clienteAtendido.nombre}! (+100 pts)`;
  }
}

function dispararAccionE() {
  if (typeof modoDomiciliosActivo !== "undefined" && modoDomiciliosActivo) {
    interactuarDomicilioConE();
  } else if (juegoIniciado) {
    interactuarConTeclaE();
  }
}

window.addEventListener("keydown", (e) => {
  const tecla = e.key.toLowerCase();
  if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(tecla)) {
    e.preventDefault();
  }

  if (tecla === "e" && !teclas["e"]) {
    dispararAccionE();
  }

  teclas[tecla] = true;
});

window.addEventListener("keyup", (e) => {
  teclas[e.key.toLowerCase()] = false;
});

function hayColision(x, y) {
  const margen = 3;
  if (x < 55 || y < 65 || x + jugador.ancho > 905 || y + jugador.alto > 500) {
    return true;
  }

  return obstaculos.some((o) =>
    x + jugador.ancho - margen > o.x &&
    x + margen < o.x + o.w &&
    y + jugador.alto - margen > o.y &&
    y + margen < o.y + o.h
  );
}

function actualizar(dt) {
  let dx = 0;
  let dy = 0;

  if (teclas["w"] || teclas["arrowup"]) dy -= 1;
  if (teclas["s"] || teclas["arrowdown"]) dy += 1;
  if (teclas["a"] || teclas["arrowleft"]) dx -= 1;
  if (teclas["d"] || teclas["arrowright"]) dx += 1;

  if (dx !== 0 && dy !== 0) {
    dx *= Math.SQRT1_2;
    dy *= Math.SQRT1_2;
  }

  const paso = jugador.velocidad * (dt * 60);
  const nuevoX = jugador.x + dx * paso;
  const nuevoY = jugador.y + dy * paso;

  if (!hayColision(nuevoX, jugador.y)) jugador.x = nuevoX;
  if (!hayColision(jugador.x, nuevoY)) jugador.y = nuevoY;

  if (!heladoEnMostrador) {
    tiempoReposicionMostrador -= dt;
    if (tiempoReposicionMostrador <= 0) {
      heladoEnMostrador = true;
      pedidoMostrador = crearPedidoAleatorio();
    }
  }

  tiempoSiguienteCliente -= dt;
  if (tiempoSiguienteCliente <= 0) {
    crearCliente();
    tiempoSiguienteCliente = 6.5;
  }

  for (let i = clientes.length - 1; i >= 0; i--) {
    const c = clientes[i];

    if (c.estado === "caminando") {
      const dist = distancia(c.x, c.y, c.objetivoX, c.objetivoY);
      if (dist > 4) {
        const velCliente = 75;
        c.x += ((c.objetivoX - c.x) / dist) * velCliente * dt;
        c.y += ((c.objetivoY - c.y) / dist) * velCliente * dt;
      } else {
        c.x = c.objetivoX;
        c.y = c.objetivoY;
        c.estado = "esperando";
      }
    } else if (c.estado === "satisfecho") {
      c.tiempoSalida -= dt;
      if (c.tiempoSalida <= 0) {
        const mesa = MESAS.find((m) => m.id === c.mesaId);
        if (mesa && mesa.cliente && mesa.cliente.id === c.id) {
          mesa.cliente = null;
        }
        clientes.splice(i, 1);
      }
    }
  }
}

function dibujarHelado(x, y, formatoId, colorSabor, escala = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(escala, escala);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  if (formatoId === "cono") {
    ctx.fillStyle = "#d99b52";
    ctx.strokeStyle = "#4a2c16";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -2);
    ctx.lineTo(8, -2);
    ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = "#9c6228";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.lineTo(2, 8);
    ctx.moveTo(4, -2);
    ctx.lineTo(-2, 8);
    ctx.stroke();

    ctx.fillStyle = colorSabor;
    ctx.strokeStyle = "#2b2d42";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -6, 7.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else if (formatoId === "copa") {
    ctx.fillStyle = "#dcebf7";
    ctx.strokeStyle = "#2b2d42";
    ctx.lineWidth = 1.8;
    ctx.fillRect(-2, 6, 4, 5);
    ctx.strokeRect(-2, 6, 4, 5);

    ctx.beginPath();
    ctx.ellipse(0, 12, 8, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colorSabor;
    ctx.beginPath();
    ctx.arc(0, -3, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#edf6fc";
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(10, -2);
    ctx.quadraticCurveTo(9, 7, 0, 7);
    ctx.quadraticCurveTo(-9, 7, -10, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  } else {
    ctx.fillStyle = colorSabor;
    ctx.strokeStyle = "#2b2d42";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -5, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#8e44ad";
    ctx.strokeStyle = "#2b2d42";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8.5, -2);
    ctx.lineTo(8.5, -2);
    ctx.lineTo(6.5, 12);
    ctx.lineTo(-6.5, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#bb8fce";
    ctx.fillRect(-7.5, 0, 15, 3);
  }

  ctx.restore();
}

function dibujarPiso() {
  const fondoListo = imagenFondo.complete && imagenFondo.naturalWidth > 0;

  if (fondoListo) {
    ctx.drawImage(imagenFondo, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#d8c9a8";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let y = 65; y < 500; y += 40) {
      for (let x = 55; x < 905; x += 40) {
        ctx.strokeStyle = "#c8b894";
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, 40, 40);
      }
    }

    ctx.fillStyle = "#f3a9c4";
    ctx.fillRect(35, 35, 890, 30);
    ctx.fillRect(35, 35, 20, 475);
    ctx.fillRect(905, 35, 20, 475);
    ctx.fillRect(35, 500, 360, 20);
    ctx.fillRect(565, 500, 360, 20);

    ctx.fillStyle = "#8bd3c7";
    ctx.fillRect(395, 500, 170, 20);
    ctx.fillStyle = "#315d58";
    ctx.font = "bold 13px Arial";
    ctx.textAlign = "center";
    ctx.fillText("ENTRADA", 480, 490);
  }
}

function dibujarHeladoEnMostrador() {
  if (!heladoEnMostrador) return;

  const hx = 490;
  const hy = 232;

  dibujarHelado(hx, hy, pedidoMostrador.formato.id, pedidoMostrador.sabor.color, 1.15);

  if (cercaDelMostrador() && !jugador.tieneHelado) {
    ctx.save();
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#171c2b";
    ctx.fillRect(hx - 48, hy - 38, 96, 18);
    ctx.fillStyle = "#ffe699";
    ctx.fillText("[E] Tomar helado", hx, hy - 25);
    ctx.restore();
  }
}

function dibujarMesasYClientes() {
  MESAS.forEach((mesa) => {
    if (jugador.tieneHelado && jugador.mesaAsignadaId === mesa.id) {
      ctx.save();
      ctx.strokeStyle = "#ffe66d";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(mesa.x - 4, mesa.y - 4, mesa.w + 8, mesa.h + 8);
      ctx.restore();
    }

    ctx.save();
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00000088";
    ctx.fillRect(mesa.x + mesa.w / 2 - 24, mesa.y + mesa.h / 2 - 8, 48, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(mesa.nombre, mesa.x + mesa.w / 2, mesa.y + mesa.h / 2 + 4);
    ctx.restore();
  });

  clientes.forEach((c) => {
    ctx.save();

    ctx.fillStyle = "#0003";
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 15, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = c.color;
    ctx.beginPath();
    ctx.ellipse(c.x, c.y + 5, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#2b2d42";
    ctx.stroke();

    ctx.fillStyle = "#f2c49f";
    ctx.beginPath();
    ctx.arc(c.x - 13, c.y + 5, 4, 0, Math.PI * 2);
    ctx.arc(c.x + 13, c.y + 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2b2d42";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#f2c49f";
    ctx.beginPath();
    ctx.arc(c.x, c.y - 6, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2b2d42";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = c.cabello || "#4a3228";
    ctx.beginPath();
    ctx.arc(c.x, c.y - 8, 8.5, Math.PI, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#171c2b";
    ctx.beginPath();
    ctx.arc(c.x - 3, c.y - 5, 1.4, 0, Math.PI * 2);
    ctx.arc(c.x + 3, c.y - 5, 1.4, 0, Math.PI * 2);
    ctx.fill();

    if (c.estado === "esperando") {
      const gx = c.x;
      const gy = c.y - 32;

      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(gx, gy, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#2b2d42";
      ctx.lineWidth = 1.8;
      ctx.stroke();

      dibujarHelado(gx, gy + 1, c.pedido.formato.id, c.pedido.sabor.color, 0.72);
    } else if (c.estado === "satisfecho") {
      ctx.font = "bold 12px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#2ec4b6";
      ctx.fillText("♥ ¡Gracias!", c.x, c.y - 26);
    }

    ctx.restore();
  });
}

function dibujarJugador() {
  const tamano = 56;
  const offsetX = jugador.x - (tamano - jugador.ancho) / 2;
  const offsetY = jugador.y - (tamano - jugador.alto);

  ctx.fillStyle = "#0003";
  ctx.beginPath();
  ctx.ellipse(
    jugador.x + jugador.ancho / 2,
    jugador.y + jugador.alto + 2,
    tamano * 0.36,
    7,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  const img = imagenesCargadas[jugador.id];
  const tieneImagenLista = img && img.complete && img.naturalWidth > 0;

  if (tieneImagenLista) {
    ctx.drawImage(img, offsetX, offsetY, tamano, tamano);
  } else {
    ctx.fillStyle = jugador.color;
    ctx.fillRect(jugador.x + 3, jugador.y + 10, 19, 16);
    ctx.fillStyle = "#f2c49f";
    ctx.fillRect(jugador.x + 6, jugador.y, 13, 13);
    ctx.fillStyle = "#573b35";
    ctx.fillRect(jugador.x + 5, jugador.y - 2, 15, 6);
    ctx.fillStyle = "#fff";
    ctx.fillRect(jugador.x + 8, jugador.y + 5, 3, 3);
    ctx.fillRect(jugador.x + 15, jugador.y + 5, 3, 3);
  }

  if (jugador.tieneHelado && jugador.pedidoHelado) {
    const hx = jugador.x + jugador.ancho + 10;
    const hy = jugador.y + jugador.alto / 2;
    dibujarHelado(hx, hy, jugador.pedidoHelado.formato.id, jugador.pedidoHelado.sabor.color, 0.95);
  }

  if (jugador.nombre) {
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    const centroX = jugador.x + jugador.ancho / 2;
    const textoY = offsetY - 6;

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#171c2b";
    ctx.strokeText(jugador.nombre, centroX, textoY);

    ctx.fillStyle = "#fff";
    ctx.fillText(jugador.nombre, centroX, textoY);
  }
}

function dibujarHUD() {
  ctx.save();
  ctx.fillStyle = "#171c2bcc";
  ctx.fillRect(16, 12, 690, 32);
  ctx.strokeStyle = "#ffb5d2";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 12, 690, 32);

  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = jugador.tieneHelado ? "#ffe66d" : "#fff";
  ctx.fillText(avisoBanner, 28, 33);

  ctx.fillStyle = "#171c2bcc";
  ctx.fillRect(720, 12, 224, 32);
  ctx.strokeStyle = "#8bd3c7";
  ctx.strokeRect(720, 12, 224, 32);

  ctx.textAlign = "right";
  ctx.fillStyle = "#8bd3c7";
  ctx.fillText(`PUNTOS: ${puntuacion}`, 930, 33);
  ctx.restore();
}

function dibujar() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dibujarPiso();
  dibujarHeladoEnMostrador();
  dibujarMesasYClientes();
  dibujarJugador();
  dibujarHUD();
}

function bucle(ahora) {
  if (typeof modoDomiciliosActivo !== "undefined" && modoDomiciliosActivo) return;

  const dt = Math.min((ahora - ultimoFrame) / 1000, 0.05);
  ultimoFrame = ahora;

  actualizar(dt);
  dibujar();
  requestAnimationFrame(bucle);
}

// Soporte táctil / mouse para botones en pantalla.
const botonesDireccion = document.querySelectorAll(".btn-control[data-tecla]");
const btnAccionE = document.getElementById("btn-accion-e");

function activarTeclaVirtual(tecla, botonEl) {
  teclas[tecla] = true;
  if (botonEl) botonEl.classList.add("presionado");
}

function soltarTeclaVirtual(tecla, botonEl) {
  teclas[tecla] = false;
  if (botonEl) botonEl.classList.remove("presionado");
}

botonesDireccion.forEach((btn) => {
  const tecla = btn.dataset.tecla;

  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    activarTeclaVirtual(tecla, btn);
  });

  const liberar = (e) => {
    e.preventDefault();
    soltarTeclaVirtual(tecla, btn);
  };

  btn.addEventListener("pointerup", liberar);
  btn.addEventListener("pointercancel", liberar);
  btn.addEventListener("lostpointercapture", liberar);
});

if (btnAccionE) {
  btnAccionE.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    btnAccionE.classList.add("presionado");
    dispararAccionE();
  });

  const liberarAccion = (e) => {
    e.preventDefault();
    btnAccionE.classList.remove("presionado");
  };

  btnAccionE.addEventListener("pointerup", liberarAccion);
  btnAccionE.addEventListener("pointercancel", liberarAccion);
}

renderizarPersonajes();