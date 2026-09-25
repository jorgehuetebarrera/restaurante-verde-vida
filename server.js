require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const app = express();

// MIDDLEWARES
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// SERVIR ARCHIVOS ESTÁTICOS (Busca tanto en 'public' como en la raíz)
if (fs.existsSync(path.join(__dirname, 'public'))) {
  app.use(express.static(path.join(__dirname, 'public')));
}
app.use(express.static(__dirname));

// CONEXIÓN A MONGODB ATLAS
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ Error: Falta la variable MONGODB_URI en las variables de entorno.');
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

// CONFIGURACIÓN DE NODEMAILER (PUERTO 587 E IPv4 COMPATIBLE CON RENDER)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Usa STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  family: 4 // Fuerza el uso de IPv4
});

// RUTA POST: CREAR RESERVA Y ENVIAR CORREO
app.post('/api/reservas', async (req, res) => {
  try {
    const { nombre, email, telefono, fecha, hora, comensales, alergias, ocasion, origen } = req.body;

    // 1. Guardar primero en MongoDB Atlas
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
    console.log(`✅ Reserva registrada en MongoDB Atlas para ${nombre}`);

    // 2. Intentar enviar correo de confirmación de forma independiente
    try {
      if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
        await transporter.sendMail({
          from: `"Restaurante Verde Vida" <${process.env.EMAIL_USER}>`,
          to: email,
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
                `Si necesitas modificar tu reserva, puedes responder a este correo o llamarnos.\n\n` +
                `Restaurante Verde Vida - Gastronomía Saludable y Sostenible`
        });
        console.log(`✉️ Correo de confirmación enviado a ${email}`);
      } else {
        console.warn('⚠️ EMAIL_USER o EMAIL_PASS no están configurados. Correo omitido.');
      }
    } catch (emailError) {
      console.error('⚠️ La reserva se guardó en la BD, pero hubo un detalle al enviar el correo:', emailError.message);
    }

    // 3. Responder al cliente que la reserva fue exitosa
    return res.status(200).json({
      status: 'ok',
      message: 'Reserva guardada con éxito'
    });

  } catch (error) {
    console.error('❌ Error al procesar la reserva:', error);
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
    respuesta = 'Nuestra carta cuenta con 9 opciones 100% plant-based: desde el Bowl Verde Nutritivo, Curry de Verduras, hasta Tacos de Jackfruit y Tiramisú de Anacardo. ¡Todos preparados con ingredientes locales de Km 0!';
  } else if (msg.includes('reserva') || msg.includes('reservar') || msg.includes('mesa')) {
    respuesta = 'Puedes reservar tu mesa directamente rellenando el formulario que encontrarás más abajo en esta misma página. ¡Recibirás un correo de confirmación al instante!';
  } else if (msg.includes('horario') || msg.includes('abierto') || msg.includes('hora')) {
    respuesta = 'Nuestro horario de apertura es de Martes a Domingo: Comidas de 13:30 h a 16:30 h y Cenas de 20:30 h a 23:30 h. (Lunes cerrado por descanso).';
  } else if (msg.includes('donde') || msg.includes('direccion') || msg.includes('ubicacion') || msg.includes('llegar')) {
    respuesta = 'Estamos ubicados en Calle Verde 123, 28001 Madrid, cerca del Parque del Retiro.';
  } else if (msg.includes('gluten') || msg.includes('alergia') || msg.includes('intolerancia') || msg.includes('vegano')) {
    respuesta = 'Toda nuestra carta es 100% vegetariana y vegana. Además, contamos con opciones adaptadas sin gluten y sin frutos secos. Puedes indicárnoslo en la casilla de alergias al reservar.';
  } else {
    respuesta = 'Gracias por tu consulta 🌿. Para una atención más personalizada, puedes llamarnos al +34 912 345 678 o escribirnos por WhatsApp desde el botón del pie de página.';
  }

  return res.json({ respuesta });
});

// SERVIR EL FRONTEND (DETECTA AUTOMÁTICAMENTE SI index.html ESTÁ EN 'public' O EN LA RAÍZ)
app.get('*', (req, res) => {
  const publicIndexPath = path.join(__dirname, 'public', 'index.html');
  const rootIndexPath = path.join(__dirname, 'index.html');

  if (fs.existsSync(publicIndexPath)) {
    res.sendFile(publicIndexPath);
  } else if (fs.existsSync(rootIndexPath)) {
    res.sendFile(rootIndexPath);
  } else {
    res.status(404).send('Error: No se encontró el archivo index.html en el servidor.');
  }
});

// PUERTO DE ESCUCHA (ADAPTATIVO PARA RENDER)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en puerto ${PORT}`);
});