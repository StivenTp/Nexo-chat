# Informe del proyecto — NEXO Chat

**Asignatura:** Programación Web / Node.js, Unidad 4  
**Actividad:** Desarrollo de una aplicación de chat en tiempo real utilizando Socket.IO  
**Institución:** Universidad de Cartagena  
**Modalidad:** Actividad individual  
**Estudiante:** Stiven Torres Pernet
**Fecha:** 10/11/2026

## 1. Introducción

NEXO Chat es una aplicación web que permite que varias personas intercambien mensajes en tiempo real sin recargar la página. Se desarrolló con Node.js, el módulo HTTP nativo y Socket.IO para implementar la comunicación bidireccional basada en eventos. El cliente utiliza HTML, CSS y JavaScript sin frameworks adicionales.

## 2. Problema identificado

En una página web tradicional, los mensajes no aparecen automáticamente si no existe un mecanismo para recibir novedades del servidor. Un chat necesita distribuir los mensajes y los cambios de estado entre todos los usuarios conectados de forma inmediata.

## 3. Objetivos

**General:** Construir una aplicación de chat en tiempo real mediante Socket.IO en Node.js.

**Específicos:**

- Configurar un servidor HTTP en Node.js y enlazar Socket.IO.
- Permitir que usuarios entren al chat con un nombre.
- Enviar y recibir mensajes instantáneamente mediante eventos.
- Mostrar los mensajes, participantes conectados y estado de escritura.
- Validar las entradas, organizar el código y realizar pruebas funcionales.

## 4. Herramientas utilizadas

| Tecnología | Aplicación en el proyecto |
| --- | --- |
| Node.js | Ejecuta JavaScript en el servidor. |
| `http` de Node.js | Atiende peticiones y sirve la interfaz del chat. |
| Socket.IO | Abre y administra la comunicación bidireccional por eventos. |
| HTML5 | Define la estructura de la interfaz. |
| CSS3 | Define la presentación y el diseño adaptable. |
| JavaScript | Escucha eventos y actualiza el DOM sin recargar. |
| npm | Gestiona paquetes y comandos. |
| `node:test` y `socket.io-client` | Permiten ejecutar pruebas de integración. |

## 5. Arquitectura y flujo de mensajes

```text
       Cliente A                        Servidor                        Cliente B
  HTML / CSS / JavaScript          Node.js HTTP + Socket.IO       HTML / CSS / JavaScript
          |                                 |                                |
          | -- user:join (Ana) -----------> |                                |
          |                                 | <--------- user:join (Luis) -- |
          | -- chat:send (Hola) ----------> |                                |
          |                                 | -- chat:message (Hola) ------> |
          | <------ chat:message (Hola) --- |                                |
          |                                 |                                |
          | <--- users:update ------------ | ------------ users:update --> |
```

La comunicación es **bidireccional**: el navegador emite eventos, y el servidor envía eventos a los clientes sin esperar una recarga manual. `io.emit()` difunde cada mensaje a todos los participantes.

### Eventos implementados

| Evento | Origen → destino | Función |
| --- | --- | --- |
| `user:join` | Cliente → servidor | Identifica a quien ingresa al chat. |
| `chat:send` | Cliente → servidor | Solicita el envío de un mensaje. |
| `chat:message` | Servidor → todos | Entrega un nuevo mensaje. |
| `chat:history` | Servidor → cliente | Recupera los últimos mensajes en memoria. |
| `chat:system` | Servidor → todos | Informa ingresos y salidas. |
| `users:update` | Servidor → todos | Actualiza los participantes conectados. |
| `chat:typing` | Bidireccional | Informa que una persona está escribiendo. |
| `connect` / `disconnect` | Socket.IO | Detecta cambios de conexión. |

## 6. Proceso de desarrollo

1. Se organizó una carpeta Node.js con los archivos `server.js`, `package.json` y el directorio `public`.
2. Se creó un servidor con `http.createServer` y se conectó una instancia de `Server` de Socket.IO.
3. Se configuraron los eventos `connection`, `user:join`, `chat:send`, `chat:typing` y `disconnect`.
4. Se diseñó la interfaz con HTML y CSS y se programaron sus interacciones con JavaScript.
5. Se añadió validación de nombres y mensajes en el servidor y renderización segura de texto en el navegador.
6. Se prepararon pruebas automáticas de múltiples clientes y un procedimiento de verificación manual.

## 7. Pruebas propuestas

> Para informar que una prueba pasó, debe ejecutarse en el equipo. No se deben presentar como evidencia resultados que no se hayan observado.

| Prueba | Acción | Resultado esperado |
| --- | --- | --- |
| Carga inicial | Ejecutar `npm start` y abrir `localhost:3000`. | Aparece NEXO Chat y el formulario de ingreso. |
| Dos participantes | Abrir dos pestañas y elegir dos apodos. | Ambos nombres aparecen en la lista «En línea». |
| Mensaje instantáneo | Enviar un texto desde la primera pestaña. | Aparece inmediatamente en ambas ventanas. |
| Mensaje de respuesta | Responder desde la segunda pestaña. | La primera pestaña recibe la respuesta sin actualizar. |
| Indicador de escritura | Escribir sin enviar desde una pestaña. | La otra muestra «está escribiendo…». |
| Nuevo participante | Abrir una tercera pestaña y entrar. | Recibe el historial reciente de mensajes. |
| Validación | Intentar enviar texto vacío. | No se envía ningún mensaje vacío. |
| Desconexión | Cerrar una pestaña. | Disminuye el contador de usuarios en línea. |
| Automatización | Ejecutar `npm test`. | El entorno informa los resultados de pruebas HTTP y Socket.IO. |

## 8. Problemas habituales y soluciones

**`npm` no se reconoce:** instalar Node.js y reiniciar la terminal.  
**`Cannot find module 'socket.io'`:** abrir la carpeta del proyecto y ejecutar `npm install`.  
**`EADDRINUSE: address already in use`:** cerrar el proceso que usa el puerto 3000 o ejecutar con otro puerto.  
**La página se abre pero no conecta:** entrar a `http://localhost:3000` en lugar de abrir el archivo HTML directamente.  
**Un segundo celular no encuentra `localhost`:** si está en la misma red, usar la IP local del computador que ejecuta Node.js y comprobar el firewall.  
**Los mensajes desaparecen al reiniciar:** el historial está en memoria; sería necesario agregar base de datos para conservarlo permanentemente.

## 9. Buenas prácticas aplicadas

- Separación entre lógica del servidor (`server.js`), interfaz (`index.html` y `styles.css`) y cliente (`app.js`).
- Constantes con nombres descriptivos, funciones pequeñas y comentarios explicativos.
- Validaciones de nombre (2–24 caracteres) y mensaje (1–500 caracteres).
- Uso de `textContent` para evitar interpretar mensajes como código HTML.
- Restricción de archivos públicos servidos por HTTP.
- Confirmación de recepción mediante acknowledgements de Socket.IO.
- Pruebas de integración preparadas para ejecutarse con dos clientes programáticos.

## 10. Conclusiones

Socket.IO simplifica la construcción de aplicaciones en tiempo real al gestionar eventos de ida y vuelta entre el navegador y el servidor. NEXO Chat integra envío, recepción, actualizaciones de usuarios e indicadores de escritura sin recarga manual. El desarrollo permite comprender la diferencia entre una petición HTTP tradicional y una conexión persistente orientada a eventos.

La solución cumple el objetivo educativo de implementar un chat en Node.js. Como futuras mejoras pueden agregarse autenticación, salas independientes, base de datos, archivos adjuntos y mensajes privados.

## 11. Bibliografía

- Socket.IO. (s. f.). *Introduction*. https://socket.io/docs/v4/
- Socket.IO. (s. f.). *Get started: Chat*. https://socket.io/get-started/chat/
- Node.js. (s. f.). *HTTP*. https://nodejs.org/docs/latest/api/http.html
