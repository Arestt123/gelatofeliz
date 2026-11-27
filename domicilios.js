// Modo Domiciliario: reparto por calles y casas en mapa cenital (960x540).
const RUTA_MAPA_CALLES = "img/vallejo.jpeg";
const imagenMapaCalles = new Image();
imagenMapaCalles.src = RUTA_MAPA_CALLES;

// Ponlo en false cuando ya no quieras ver las cajas rojas de colisión.
const MOSTRAR_COLISIONES_CALLE = true;

// Manzanas, edificios, local, camellón y áreas verdes bloqueadas; las calles quedan libres.
const obstaculosCalle = [
  // Arriba-izquierda (terreno verde + casas) hasta antes de la calle vertical x: 270..312 y calle horizontal y: 158..196
  { x: 0,   y: 0,   w: 270, h: 120 },

  // Arriba-centro (casas superiores) hasta antes de la calle y: 158..196
  { x: 312, y: 0,   w: 150, h: 120 },

  // Arriba-derecha (Estación de Policía y casas) hasta antes de la avenida x: 517..588 y calle y: 158..196
  { x: 588, y: 0,   w: 372, h: 200 },

  // Izquierda superior (entre calle y:196 y calle y:315, a la izquierda de calle x:270..312)
  { x: 0,   y: 196, w: 270, h: 119 },

  // Local GELATO Feliz (deja libre la calle superior y:158..196, la calle izq x:270..312 y la calle inferior y:315..345)
  { x: 312, y: 196, w: 150, h: 105 },

  // Derecha superior (entre calle y:196 y calle y:262, a la derecha de avenida x:517..588)


  // Izquierda inferior (debajo de calle y:315 y a la izquierda de calle x:270..312, encima de calle y:435..475)
 

  // Bloque central inferior (casas debajo del local, entre calle y:345 y calle y:435)
  { x: 312, y: 345, w: 150, h: 90  },

  // Derecha inferior (debajo de calle y:298 y a la derecha de avenida x:517..588, encima de calle y:435..475)
  { x: 588, y: 298, w: 372, h: 137 },

  // Borde inferior izquierdo y derecho (por debajo de la calle y:435..475)
  { x: 0,   y: 475, w: 517, h: 65  },
  { x: 588, y: 475, w: 372, h: 65  },

 

];

// 6 casas ubicadas en las manzanas y su punto exacto de entrega en la calle.
const CASAS_ENTREGA = [
  { id: 1, nombre: "Casa 1", x: 390, y: 112, calleX: 390, calleY: 176, pedido: null },
  { id: 2, nombre: "Casa 2", x: 650, y: 218, calleX: 650, calleY: 280, pedido: null },
  { id: 3, nombre: "Casa 3", x: 215, y: 245, calleX: 290, calleY: 245, pedido: null },
  { id: 4, nombre: "Casa 4", x: 215, y: 375, calleX: 290, calleY: 375, pedido: null },
  { id: 5, nombre: "Casa 5", x: 435, y: 392, calleX: 435, calleY: 452, pedido: null },
  { id: 6, nombre: "Casa 6", x: 660, y: 365, calleX: 610, calleY: 365, pedido: null }
];

// Punto de recogida en la calle justo frente al local GELATO Feliz.
const PUNTO_GELATO_CALLE = { x: 415, y: 325 };

let modoDomiciliosActivo = false;
let bucleDomiciliosIniciado = false;
let ultimoFrameDom = performance.now();

let pedidoDisponibleLocal = null;
let tiempoSiguienteDomicilio = 1.2;
let puntosDomicilio = 0;
let avisoDomicilio = "Ve al local GELATO Feliz en la calle y pulsa E para recoger un domicilio.";

const repartidor = {
  id: null,
  x: PUNTO_GELATO_CALLE.x,
  y: PUNTO_GELATO_CALLE.y,
  ancho: 22,
  alto: 24,
  velocidad: 3.1,
  color: "#48c9b0",
  nombre: "",
  labor: "",
  tienePedido: false,
  pedidoActual: null,
  casaAsignadaId: null
};

function distDom(x1, y1, x2, y2) {
  return Math.hypot(x2 - x1, y2 - y1);
}

function hayColisionCalle(x, y) {
  const margen = 2;
  if (x < 4 || y < 4 || x + repartidor.ancho > canvas.width - 4 || y + repartidor.alto > canvas.height - 4) {
    return true;
  }

  return obstaculosCalle.some((o) =>
    x + repartidor.ancho - margen > o.x &&
    x + margen < o.x + o.w &&
    y + repartidor.alto - margen > o.y &&
    y + margen < o.y + o.h
  );
}

function crearDomicilioAleatorio() {
  const casasLibres = CASAS_ENTREGA.filter((casa) => casa.pedido === null);
  if (casasLibres.length === 0) return;

  const casaElegida = casasLibres[Math.floor(Math.random() * casasLibres.length)];
  const sabor = SABORES[Math.floor(Math.random() * SABORES.length)];
  const formato = FORMATOS[Math.floor(Math.random() * FORMATOS.length)];

  casaElegida.pedido = {
    casaId: casaElegida.id,
    casaNombre: casaElegida.nombre,
    sabor,
    formato
  };

  if (!pedidoDisponibleLocal) {
    pedidoDisponibleLocal = casaElegida.pedido;
  }

  if (!repartidor.tienePedido) {
    avisoDomicilio = `Nuevo domicilio para ${casaElegida.nombre} (${formato.nombre} de ${sabor.nombre}). ¡Recógelo en GELATO Feliz (E)!`;
  }
}

function cercaDelLocalGelato() {
  const cx = repartidor.x + repartidor.ancho / 2;
  const cy = repartidor.y + repartidor.alto / 2;
  return distDom(cx, cy, PUNTO_GELATO_CALLE.x, PUNTO_GELATO_CALLE.y) <= 72;
}

function casaCercanaEnCalle() {
  const cx = repartidor.x + repartidor.ancho / 2;
  const cy = repartidor.y + repartidor.alto / 2;

  return CASAS_ENTREGA.find((casa) => {
    const dCalle = distDom(cx, cy, casa.calleX, casa.calleY);
    const dCasa = distDom(cx, cy, casa.x, casa.y);
    return dCalle <= 72 || dCasa <= 82;
  });
}

function interactuarDomicilioConE() {
  if (!modoDomiciliosActivo) return;

  if (!repartidor.tienePedido && cercaDelLocalGelato()) {
    if (!pedidoDisponibleLocal) {
      crearDomicilioAleatorio();
    }

    const casaPendiente = CASAS_ENTREGA.find((c) => c.pedido !== null);
    const pedidoFinal = pedidoDisponibleLocal || (casaPendiente ? casaPendiente.pedido : null);

    if (!pedidoFinal) {
      avisoDomicilio = "Aún no hay domicilios listos. Espera un momento.";
      return;
    }

    repartidor.tienePedido = true;
    repartidor.pedidoActual = pedidoFinal;
    repartidor.casaAsignadaId = pedidoFinal.casaId;
    pedidoDisponibleLocal = null;

    avisoDomicilio = `¡Domicilio recogido! Llévalo a ${pedidoFinal.casaNombre} (${pedidoFinal.formato.nombre} de ${pedidoFinal.sabor.nombre}).`;
    return;
  }

  if (repartidor.tienePedido) {
    const casa = casaCercanaEnCalle();
    if (!casa) {
      avisoDomicilio = repartidor.casaAsignadaId
        ? `Ve por la calle hasta la Casa ${repartidor.casaAsignadaId} y pulsa E para entregar.`
        : "Acércate a una casa con domicilio y pulsa E para entregar.";
      return;
    }

    if (!casa.pedido) {
      avisoDomicilio = `La ${casa.nombre} no tiene un domicilio pendiente ahora.`;
      return;
    }

    const nombreCasa = casa.nombre;
    casa.pedido = null;
    puntosDomicilio += 150;

    repartidor.tienePedido = false;
    repartidor.pedidoActual = null;
    repartidor.casaAsignadaId = null;

    const siguienteCasa = CASAS_ENTREGA.find((c) => c.pedido !== null);
    pedidoDisponibleLocal = siguienteCasa ? siguienteCasa.pedido : null;

    avisoDomicilio = `¡Domicilio entregado en ${nombreCasa}! (+150 pts) Vuelve a GELATO Feliz por otro pedido.`;
  }
}

function actualizarDomicilios(dt) {
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

  const paso = repartidor.velocidad * (dt * 60);
  const nx = repartidor.x + dx * paso;
  const ny = repartidor.y + dy * paso;

  if (!hayColisionCalle(nx, repartidor.y)) repartidor.x = nx;
  if (!hayColisionCalle(repartidor.x, ny)) repartidor.y = ny;

  tiempoSiguienteDomicilio -= dt;
  if (tiempoSiguienteDomicilio <= 0) {
    crearDomicilioAleatorio();
    tiempoSiguienteDomicilio = 7.0;
  }
}

function dibujarColisionesCalleDebug() {
  if (!MOSTRAR_COLISIONES_CALLE) return;
  ctx.save();
  ctx.fillStyle = "#ff2e6326";
  ctx.strokeStyle = "#ff2e63aa";
  ctx.lineWidth = 1.5;
  obstaculosCalle.forEach((o) => {
    ctx.fillRect(o.x, o.y, o.w, o.h);
    ctx.strokeRect(o.x, o.y, o.w, o.h);
  });
  ctx.restore();
}

function dibujarMapaDomicilios() {
  if (imagenMapaCalles.complete && imagenMapaCalles.naturalWidth > 0) {
    ctx.drawImage(imagenMapaCalles, 0, 0, canvas.width, canvas.height);
  } else {
    ctx.fillStyle = "#5d6470";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Cargando mapa de calles...", canvas.width / 2, canvas.height / 2);
  }

  dibujarColisionesCalleDebug();

  ctx.save();
  ctx.strokeStyle = repartidor.tienePedido ? "#ffffff88" : "#ffe66d";
  ctx.lineWidth = 2.5;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.arc(PUNTO_GELATO_CALLE.x, PUNTO_GELATO_CALLE.y, 18, 0, Math.PI * 2);
  ctx.stroke();

  if (!repartidor.tienePedido && cercaDelLocalGelato()) {
    ctx.setLineDash([]);
    ctx.fillStyle = "#171c2b";
    ctx.fillRect(PUNTO_GELATO_CALLE.x - 58, PUNTO_GELATO_CALLE.y - 42, 116, 20);
    ctx.fillStyle = "#ffe699";
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillText("[E] Recoger pedido", PUNTO_GELATO_CALLE.x, PUNTO_GELATO_CALLE.y - 28);
  }
  ctx.restore();

  CASAS_ENTREGA.forEach((casa) => {
    const esObjetivo = repartidor.tienePedido && repartidor.casaAsignadaId === casa.id;

    if (esObjetivo) {
      ctx.save();
      ctx.strokeStyle = "#ffe66d";
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(casa.x - 24, casa.y - 24, 48, 48);
      ctx.restore();
    }

    ctx.save();
    ctx.font = "bold 11px Arial";
    ctx.textAlign = "center";
    ctx.fillStyle = "#00000099";
    ctx.fillRect(casa.x - 26, casa.y + 12, 52, 16);
    ctx.fillStyle = esObjetivo ? "#ffe66d" : "#fff";
    ctx.fillText(casa.nombre, casa.x, casa.y + 24);
    ctx.restore();

    if (casa.pedido) {
      ctx.save();
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#171c2b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(casa.x, casa.y - 16, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (typeof dibujarHelado === "function") {
        dibujarHelado(casa.x, casa.y - 15, casa.pedido.formato.id, casa.pedido.sabor.color, 0.72);
      }
      ctx.restore();
    }
  });
}

function dibujarRepartidor() {
  const tamano = 48;
  const offsetX = repartidor.x - (tamano - repartidor.ancho) / 2;
  const offsetY = repartidor.y - (tamano - repartidor.alto);

  ctx.fillStyle = "#0004";
  ctx.beginPath();
  ctx.ellipse(
    repartidor.x + repartidor.ancho / 2,
    repartidor.y + repartidor.alto + 2,
    tamano * 0.34,
    6,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();

  const img = imagenesCargadas[repartidor.id];
  const tieneImg = img && img.complete && img.naturalWidth > 0;

  if (tieneImg) {
    ctx.drawImage(img, offsetX, offsetY, tamano, tamano);
  } else {
    ctx.fillStyle = repartidor.color;
    ctx.beginPath();
    ctx.arc(repartidor.x + repartidor.ancho / 2, repartidor.y + repartidor.alto / 2, 12, 0, Math.PI * 2);
    ctx.fill();
  }

  if (repartidor.tienePedido && repartidor.pedidoActual && typeof dibujarHelado === "function") {
    dibujarHelado(
      repartidor.x + repartidor.ancho + 10,
      repartidor.y + repartidor.alto / 2,
      repartidor.pedidoActual.formato.id,
      repartidor.pedidoActual.sabor.color,
      0.88
    );
  }

  if (repartidor.nombre) {
    ctx.font = "bold 12px Arial";
    ctx.textAlign = "center";
    const cx = repartidor.x + repartidor.ancho / 2;
    const ty = offsetY - 6;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#171c2b";
    ctx.strokeText(repartidor.nombre, cx, ty);
    ctx.fillStyle = "#fff";
    ctx.fillText(repartidor.nombre, cx, ty);
  }
}

function dibujarHUDDomicilios() {
  ctx.save();
  ctx.fillStyle = "#171c2bcc";
  ctx.fillRect(16, 12, 690, 32);
  ctx.strokeStyle = "#8bd3c7";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(16, 12, 690, 32);

  ctx.font = "bold 13px Arial";
  ctx.textAlign = "left";
  ctx.fillStyle = repartidor.tienePedido ? "#ffe66d" : "#fff";
  ctx.fillText(avisoDomicilio, 28, 33);

  ctx.fillStyle = "#171c2bcc";
  ctx.fillRect(720, 12, 224, 32);
  ctx.strokeStyle = "#8bd3c7";
  ctx.strokeRect(720, 12, 224, 32);

  ctx.textAlign = "right";
  ctx.fillStyle = "#8bd3c7";
  ctx.fillText(`DOMICILIOS: ${puntosDomicilio}`, 930, 33);
  ctx.restore();
}

function bucleDomicilios(ahora) {
  if (!modoDomiciliosActivo) return;

  const dt = Math.min((ahora - ultimoFrameDom) / 1000, 0.05);
  ultimoFrameDom = ahora;

  actualizarDomicilios(dt);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  dibujarMapaDomicilios();
  dibujarRepartidor();
  dibujarHUDDomicilios();

  requestAnimationFrame(bucleDomicilios);
}

function iniciarModoDomicilios(personaje) {
  modoDomiciliosActivo = true;
  repartidor.id = personaje.id;
  repartidor.nombre = personaje.nombre;
  repartidor.labor = personaje.labor;
  repartidor.color = personaje.color;
  repartidor.x = PUNTO_GELATO_CALLE.x;
  repartidor.y = PUNTO_GELATO_CALLE.y;
  repartidor.tienePedido = false;
  repartidor.pedidoActual = null;
  repartidor.casaAsignadaId = null;

  CASAS_ENTREGA.forEach((c) => { c.pedido = null; });
  pedidoDisponibleLocal = null;
  puntosDomicilio = 0;
  tiempoSiguienteDomicilio = 1.0;
  avisoDomicilio = "Ve al local GELATO Feliz en la calle y pulsa E para recoger un domicilio.";

  crearDomicilioAleatorio();

  if (!bucleDomiciliosIniciado) {
    bucleDomiciliosIniciado = true;
    ultimoFrameDom = performance.now();
    requestAnimationFrame(bucleDomicilios);
  }
}