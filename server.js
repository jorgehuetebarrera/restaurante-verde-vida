require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SERVIR ARCHIVOS ESTÁTICOS
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}
app.use(express.static(__dirname));

// CONEXIÓN A MONGODB ATLAS
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: Falta la variable MONGODB_URI en Render.');
} else {
  mongoose.connect(MONGODB_URI)
    .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
    .catch(err => console.error('❌ Error de conexión a MongoDB Atlas:', err.message));
}

// ESQUEMA Y MODELO DE RESERVA
const reservaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  telefono: { type: String, required: true },
  fecha: { type: String, required: true },
  hora: { type: String, required: true },
  comensales: { type: String, required: true },
  alergias: { type: String, default: 'Ninguna' },
  ocasion: { type: String, default: 'Ninguna' },
  origen: { type: String, default: 'No especificado' },
  fechaRegistro: { type: Date, default: Date.now }
});

const Reserva = mongoose.model('Reserva', reservaSchema);

// RUTA POST: CREAR RESERVA Y ENVIAR EMAIL DESDE TU GMAIL VÍA GOOGLE APPS SCRIPT
app.post('/api/reservas', async (req, res) => {
  try {
    const { nombre, email, telefono, fecha, hora, comensales, alergias, ocasion, origen } = req.body;

    // 1. Guardar la reserva en MongoDB Atlas
    const nuevaReserva = new Reserva({
      nombre,
      email,
      telefono,
      fecha,
      hora,
      comensales,
      alergias,
      ocasion,
      origen
    });

    await nuevaReserva.save();
    console.log(`✅ Reserva guardada en MongoDB para ${nombre}`);

    // 2. Enviar email de confirmación desde tu Gmail a CUALQUIER destinatario
    if (process.env.GOOGLE_SCRIPT_URL) {
      try {
        const googleResponse = await fetch(process.env.GOOGLE_SCRIPT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email, // Correo del cliente que reserva
            subject: 'Confirmación de tu reserva - Restaurante Verde Vida',
            text: `¡Reserva Confirmada en Verde Vida! 🌿\n\n` +
                  `Hola ${nombre},\n\n` +
                  `Hemos recibido tu reserva correctamente. Aquí tienes los detalles:\n\n` +
                  `📅 Fecha: ${fecha}\n` +
                  `⏰ Hora: ${hora} h\n` +
                  `👥 Comensales: ${comensales}\n` +
                  `⚠️ Alergias/Notas: ${alergias}\n` +
                  `🎉 Ocasión: ${ocasion}\n\n` +
                  `📍 Dirección: Calle Verde 123, 28001 Madrid\n` +
                  `📞 Teléfono: +34 912 345 678\n\n` +
                  `Restaurante Verde Vida - Gastronomía Saludable y Sostenible`
          })
        });

        console.log(`✉️ Correo enviado desde tu Gmail a ${email} vía Google Apps Script`);
      } catch (mailErr) {
        console.error('⚠️ Excepción al enviar correo mediante Google:', mailErr.message);
      }
    } else {
      console.warn('⚠️ Variable GOOGLE_SCRIPT_URL no configurada. Omitiendo envío de email.');
    }

    // 3. Responder al cliente
    return res.status(200).json({
      status: 'ok',
      message: 'Reserva guardada con éxito'
    });

  } catch (error) {
    console.error('❌ Error general al procesar la reserva:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error al registrar la reserva en la base de datos'
    });
  }
});

// RUTA POST: CHATBOT VIRTUAL CODY
app.post('/api/chat', (req, res) => {
  const { mensaje } = req.body;
  if (!mensaje) {
    return res.json({ respuesta: '¡Hola! Soy Cody. ¿En qué puedo ayudarte hoy?' });
  }

  const msg = mensaje.toLowerCase();
  let respuesta = '';

  if (msg.includes('hola') || msg.includes('buenas')) {
    respuesta = '¡Hola! Bienvenida/o a Restaurante Verde Vida 🌿. ¿En qué puedo ayudarte hoy? Puedo informarte sobre el menú, horarios o alérgenos.';
  } else if (msg.includes('plato') || msg.includes('menu') || msg.includes('carta') || msg.includes('comer')) {
    respuesta = 'Nuestra carta cuenta con 9 opciones 100% plant-based: desde el Bowl Verde Nutritivo, Curry de Verduras, hasta Tacos de Jackfruit y Tiramisú de Anacardo.';
  } else if (msg.includes('reserva') || msg.includes('reservar') || msg.includes('mesa')) {
    respuesta = 'Puedes reservar tu mesa directamente rellenando el formulario que encontrarás más abajo en esta misma página.';
  } else if (msg.includes('horario') || msg.includes('abierto') || msg.includes('hora')) {
    respuesta = 'Nuestro horario es de Martes a Domingo: Comidas de 13:30 h a 16:30 h y Cenas de 20:30 h a 23:30 h. (Lunes cerrado).';
  } else if (msg.includes('donde') || msg.includes('direccion') || msg.includes('ubicacion')) {
    respuesta = 'Estamos ubicados en Calle Verde 123, 28001 Madrid, cerca del Parque del Retiro.';
  } else {
    respuesta = 'Gracias por tu consulta 🌿. Puedes llamarnos al +34 912 345 678 para más detalles.';
  }

  return res.json({ respuesta });
});

// SERVIR EL FRONTEND
app.get('*', (req, res) => {
  const publicIndexPath = path.join(__dirname, 'public', 'index.html');
  const rootIndexPath = path.join(__dirname, 'index.html');

  if (fs.existsSync(publicIndexPath)) {
    res.sendFile(publicIndexPath);
  } else if (fs.existsSync(rootIndexPath)) {
    res.sendFile(rootIndexPath);
  } else {
    res.status(404).send('Error: No se encontró el archivo index.html.');
  }
});

// PUERTO DE ESCUCHA
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});