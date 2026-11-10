# NEXO Chat — Comunicación en tiempo real con Socket.IO

**Actividad individual libre, Unidad 4 · Universidad de Cartagena**  
**Tecnologías:** Node.js (módulo HTTP nativo), Socket.IO 4.x, HTML5, CSS3 y JavaScript.

## Requisitos previos

- Node.js 18.17 o superior (recomendado: versión LTS).
- npm (incluido con Node.js).
- Navegador actualizado (Chrome, Firefox, Edge, etc.).
- Conexión a internet solo para instalar dependencias la primera vez.

## Instalación y ejecución

1. Extrae el contenido del ZIP.
2. Abre una terminal en la carpeta **NEXO-Chat**.
3. Instala las dependencias:

   ```bash
   npm install
   ```

4. Inicia el servidor:

   ```bash
   npm start
   ```

5. Abre **http://localhost:3000** en el navegador.
6. Escribe tu nombre y presiona **Entrar al chat**.
7. Abre una segunda pestaña o navegador con la misma dirección, usa otro nombre y envía mensajes entre ambos.

Para detener el servidor: **Ctrl + C** en la terminal.

> Importante: No abras `public/index.html` con doble clic (`file://`). La página debe cargarse desde el servidor de Node.js para usar Socket.IO.

## Comandos útiles

| Comando | Propósito |
| --- | --- |
| `npm install` | Instalar Socket.IO y dependencias de pruebas. |
| `npm start` | Ejecutar la aplicación en el puerto 3000. |
| `npm run dev` | Iniciar con reinicio automático al modificar archivos (Node.js 18+). |
| `npm test` | Ejecutar pruebas automáticas de HTTP y Socket.IO. |
| `npm run check` | Comprobar la sintaxis de los archivos JavaScript. |

Si el puerto 3000 está ocupado, cambia temporalmente el puerto:

- **PowerShell:** `$env:PORT=3001; npm start`
- **CMD:** `set PORT=3001 && npm start`
- **Linux/macOS:** `PORT=3001 npm start`

## Funcionalidades

- Envío y recepción de mensajes sin recargar la página.
- Apodos de 2 a 24 caracteres.
- Mensajes con nombre y hora.
- Usuarios conectados en la barra lateral.
- Avisos de ingreso y salida de usuarios.
- Indicador de «está escribiendo…».
- Historial de hasta 50 mensajes **solo en memoria** para nuevas conexiones.
- Reconexión automática cuando se recupera el servidor.
- Interfaz adaptable a dispositivos móviles.
- Validación de mensajes (de 1 a 500 caracteres) en cliente y servidor.
- Visualización segura del texto mediante `textContent`.

## Estructura del proyecto

```text
NEXO-Chat/
├── server.js                  # Servidor HTTP y eventos de Socket.IO
├── package.json               # Configuración de Node.js y dependencias
├── public/
│   ├── index.html             # Estructura de la interfaz
│   ├── styles.css             # Diseño visual responsive
│   └── app.js                 # Eventos y lógica del navegador
├── tests/
│   └── chat.test.js           # Pruebas automáticas de integración
├── DOCUMENTACION.md           # Desarrollo, arquitectura y pruebas
├── INFORME_ACADEMICO.pdf      # Informe técnico listo para revisar
├── EVIDENCIAS_Y_PRUEBAS.md    # Guía para capturas y comprobaciones
├── GUIA_SUSTENTACION.md       # Explicación breve para presentar
└── README.md                  # Esta guía
```

## Cómo funciona Socket.IO en el proyecto

1. El navegador abre el chat y crea una conexión con `io()`.
2. `user:join` registra el nombre y actualiza la lista de participantes.
3. Al enviar el formulario, `chat:send` lleva el mensaje del navegador al servidor.
4. El servidor valida el mensaje y utiliza `io.emit('chat:message', ...)` para enviarlo a todos los clientes.
5. Cada navegador escucha `chat:message` y muestra el contenido inmediatamente en pantalla.
6. Los eventos de conexión, escritura y desconexión mantienen el estado visual actualizado.

**Limitación intencional:** No hay cuentas, contraseñas ni base de datos, porque la actividad se enfoca en comunicación en tiempo real. El historial desaparece cuando se reinicia el servidor.

## Referencias

- Documentación oficial de Socket.IO: https://socket.io/docs/v4/
- Tutorial oficial de chat: https://socket.io/get-started/chat/
- Documentación de Node.js: https://nodejs.org/docs/latest/api/http.html
