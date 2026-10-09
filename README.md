# SSP

Base inicial con Expo SDK 57, React Native, TypeScript y Expo Router para Android, iOS y web.

## Desarrollo

Usar Node.js LTS y npm.

```bash
npm ci
npm start
```

Desde Expo CLI, escanear el QR con una versión compatible de Expo Go, o pulsar `a` para Android y `w` para web. El simulador de iOS requiere macOS.

```bash
npm run typecheck
npm run export:web
```

## Estructura

- `src/app`: rutas y layout de navegación.
- `src/components`: componentes compartidos.
- `src/theme`: colores provisionales con modo claro y oscuro.

## Estado del diseño

Referencia proporcionada: https://claude.ai/artifact/2KKDHWdXCrCgpjDCo6giJe

El artefacto no pudo abrirse desde el entorno de desarrollo. La pantalla inicial es provisional; no reproduce los mockups. Se necesitan capturas o el código exportado para revisar pantallas, navegación, componentes, estados y comportamiento antes de implementarlos.

Todavía no se han definido backend, autenticación ni entidades de negocio.

Documentación: https://docs.expo.dev/get-started/create-a-project/
