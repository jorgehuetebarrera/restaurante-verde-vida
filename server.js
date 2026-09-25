require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// 1. Conexión a MongoDB Atlas
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
  .catch((err) => console.error('❌ Error al conectar a MongoDB:', err.message));

// 2. Esquema BSON de la Reserva
const reservaSchema = new mongoose.Schema({
  nombre: { type: String, required: true },
  email: { type: String, required: true },
  telefono: { type: String, required: true },
  fecha: { type: String, required: true },
  hora: { type: String, required: true },
  comensales: { type: String, required: true },
  alergias: { type: String, default: 'Ninguna' },
  ocasion: { type: String, default: 'Ninguna' },
  origen: { type: String, default: 'Web' },
  creadoEn: { type: Date, default: Date.now }
});

const Reserva = mongoose.model('Reserva', reservaSchema);

// 3. Configuración de Nodemailer
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // Usa STARTTLS en el puerto 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

// Función para enviar correo de confirmación
async function enviarCorreoConfirmacion(reserva) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ Correo no enviado: Faltan credenciales EMAIL_USER / EMAIL_PASS en .env');
    return;
  }

  const mailOptions = {
    from: `"Restaurante Verde Vida" <${process.env.EMAIL_USER}>`,
    to: reserva.email,
    subject: '🌱 Confirmación de tu reserva - Restaurante Verde Vida',
    html: `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #2e7d32;">¡Reserva Confirmada en Verde Vida! 🌿</h2>
        <p>Hola <strong>${reserva.nombre}</strong>,</p>
        <p>Hemos recibido tu reserva correctamente. Aquí tienes los detalles:</p>
        <div style="background-color: #f4f6f0; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <p>📅 <strong>Fecha:</strong> ${reserva.fecha}</p>
          <p>⏰ <strong>Hora:</strong> ${reserva.hora} h</p>
          <p>👥 <strong>Comensales:</strong> ${reserva.comensales}</p>
          <p>⚠️ <strong>Alergias/Notas:</strong> ${reserva.alergias}</p>
        </div>
        <p>📍 <strong>Dirección:</strong> Calle Verde 123, 28001 Madrid</p>
        <p>Si necesitas modificar tu reserva, puedes responder a este correo o llamarnos al +34 912 345 678.</p>
        <hr style="border: none; border-top: 1px solid #ccc; margin: 20px 0;">
        <p style="font-size: 0.8rem; color: #777;">Restaurante Verde Vida - Gastronomía Saludable y Sostenible</p>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
  console.log(`✉️ Correo enviado con éxito a ${reserva.email}`);
}

// 4. Ruta POST: Guardar reserva y enviar correo
app.post('/api/reservas', async (req, res) => {
  try {
    const nuevaReserva = new Reserva(req.body);
    const resultado = await nuevaReserva.save();
    
    // Intentar enviar el correo
    try {
      await enviarCorreoConfirmacion(resultado);
    } catch (mailErr) {
      console.error('⚠️ Error enviando el correo:', mailErr.message);
    }

    res.status(201).json({ status: 'ok', data: resultado });
  } catch (error) {
    console.error('Error al guardar reserva:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// 5. Ruta POST: Asistente Virtual Cody
app.post('/api/chat', (req, res) => {
  const { mensaje } = req.body;
  const msg = (mensaje || '').toLowerCase();
  let respuesta = '';

  if (msg.includes('plato') || msg.includes('recomiend') || msg.includes('comer') || msg.includes('carta')) {
    respuesta = '🍲 Te recomiendo probar nuestro *Bowl Verde Nutritivo* (12,50 €) con quinoa y tahini, o nuestro famoso *Curry de Verduras con Leche de Coco* (14,00 €). ¡Son los más pedidos!';
  } else if (msg.includes('vegan') || msg.includes('gluten') || msg.includes('alergia') || msg.includes('celiac')) {
    respuesta = '🌱 Toda nuestra carta es 100% plant-based (vegana). Además, tenemos opciones 100% libres de gluten indicadas en la carta o puedes aclararlo al reservar.';
  } else if (msg.includes('horario') || msg.includes('hora') || msg.includes('abierto')) {
    respuesta = '🕒 Abrimos de Martes a Domingo: Comidas de 13:30 h a 16:30 h y Cenas de 20:30 h a 23:30 h.';
  } else if (msg.includes('donde') || msg.includes('ubicacion') || msg.includes('direccion') || msg.includes('llegar')) {
    respuesta = '📍 Estamos ubicados en Calle Verde 123, 28001 Madrid (cerca del Metro Retiro).';
  } else if (msg.includes('reserva') || msg.includes('mesa') || msg.includes('reservar')) {
    respuesta = '📅 Puedes hacer tu reserva directamente en la sección "Reserva tu Mesa" de esta web. ¡Recibirás un correo de confirmación al instante!';
  } else {
    respuesta = '🤖 Hola, soy Cody. Puedo ayudarte con sugerencias de platos del menú, horarios, alérgenos o asistirte para realizar tu reserva. ¿Qué te gustaría consultar?';
  }

  res.json({ respuesta });
});

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor listo en http://localhost:${PORT}`);
});