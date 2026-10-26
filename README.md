# Drosophila — simulador de optogenética

Sandbox educativo de [Axolotl Discovery](https://axolotl-discovery.github.io/) para aprender optogenética jugando con el cerebro completo de la mosca de la fruta: 138 639 neuronas y 15 millones de conexiones reales.

**Descargar:** [Windows](https://github.com/Axolotl-Discovery/drosophila/releases/latest/download/Drosophila-win64.zip) · [Mac con chip Apple](https://github.com/Axolotl-Discovery/drosophila/releases/latest/download/Drosophila-mac-apple.zip) · [Mac con Intel](https://github.com/Axolotl-Discovery/drosophila/releases/latest/download/Drosophila-mac-intel.zip) — 8 GB de RAM mínimo. Instrucciones de instalación en `LEEME.txt` (Windows) y `LEEME-Mac.txt` (Mac).

## Qué hace
- Simula el conectoma FlyWire v783 con el modelo de integración y disparo de Shiu y col. (2024, *Nature*), y traduce la actividad de las neuronas descendentes en conducta de una mosca en 3D.
- **Laboratorio:** elige cualquier tipo de neurona del catálogo, ponle una opsina (CsChrimson, ChR2, GtACR1, GtACR2) y enciende luces de colores para activarla o silenciarla.
- **Aprender:** ruta de lecciones y retos, de lo básico a experimentos de suficiencia y necesidad.
- **Consola:** comandos en español para buscar neuronas, consultar conexiones, registrar actividad y escribir protocolos repetibles.
- **Competencia:** modo para clase en la misma red local (hasta 10 equipos), con tablero en vivo y exportación de la telemetría (errores, pistas y secuencia de pasos).

## Estructura
- `app/` — la aplicación de Electron tal como se empaqueta (`main.js`, motor en `engine.js`/`worker.js`, datos del conectoma en `app/data/`).
- `fuente/` — plantillas y estilos; `python3 fuente/build.py` regenera `app/index.html`, `app/tablero.html` y `app/app.js`.
- `.github/workflows/release.yml` — arma los .zip de Windows y Mac (chip Apple e Intel), prueba que la versión de Mac abra, y los publica en Releases.

Probar en el navegador: `cd app && python3 -m http.server 8765` y abrir http://localhost:8765 (la competencia y el descubrimiento en red solo funcionan en la versión de escritorio).

## Publicar una versión nueva
1. Cambia `version` en `app/package.json`.
2. `git tag v4.2.0 && git push origin v4.2.0`, o en GitHub: *Actions → Publicar versión → Run workflow* con la etiqueta.

## Créditos
Ver `app/CREDITOS.txt`. Datos de FlyWire (CC-BY 4.0) y del repositorio philshiu/Drosophila_brain_model (MIT).
