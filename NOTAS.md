Simulador del cerebro completo de *Drosophila* (conectoma FlyWire v783, modelo de Shiu y col. 2024) para aprender optogenética jugando.

| Sistema | Archivo |
|---|---|
| Windows 10/11 (64 bits) | `Drosophila-win64.zip` |
| Mac con chip Apple (M1, M2, M3, M4…) | `Drosophila-mac-apple.zip` |
| Mac con procesador Intel | `Drosophila-mac-intel.zip` |

**Windows:** descomprime toda la carpeta (clic derecho → *Extraer todo*) y abre `Drosophila.exe`. Si aparece "Windows protegió su PC": *Más información* → *Ejecutar de todas formas*.

**Mac:** doble clic en el .zip y arrastra `Drosophila.app` a Aplicaciones. La primera vez macOS la bloquea porque no está notarizada: en macOS 15 ve a *Ajustes del Sistema → Privacidad y seguridad → Abrir de todos modos*; en versiones anteriores, clic derecho → *Abrir*. Más detalles en `LEEME.txt` dentro del .zip.

### Novedades de la 4.3
- **Más realista:** cada opsina responde según su espectro real (CsChrimson con pico en ~590 nm, ChR2 ~470, GtACR1 ~515, GtACR2 ~470) y la luz se mide en µW/mm². ChR2 necesita luz azul intensa, GtACR1 silencia con muy poca luz y la mosca ve el azul y el verde (aparece un aviso cuando ve la luz).
- **Retinal (ATR):** sin retinal en la comida ninguna opsina funciona, como en el laboratorio.
- **Retos más difíciles:** el catálogo ya no dice qué hace cada neurona durante un reto, las pistas son preguntas y hay reglas (máximo de neuronas, que la mosca no vea la luz). Dos retos nuevos: «Azul intenso» y «Algo falla».
- **Más rápido:** el motor ahora solo calcula las neuronas que reciben señales; de 2 a 15 veces más rápido según el estímulo, con el mismo resultado.
- **Gráficos:** haz de luz del color de la lámpara sobre la mosca, piso nuevo y cerebro con puntos suaves que marcan en color las neuronas con opsina.

Requisitos: 8 GB de RAM (recomendado 16 GB). No necesita internet. Mac y Windows pueden competir en la misma sala del modo competencia.
