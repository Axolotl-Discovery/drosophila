# Arma app/index.html, app/tablero.html y app/app.js a partir de las fuentes de esta carpeta.
# Uso: python3 fuente/build.py
import os,shutil
D=os.path.dirname(os.path.abspath(__file__));A=os.path.join(D,'..','app')
r=lambda f:open(os.path.join(D,f),encoding='utf-8').read()
css=r('app4.css');base=css[:css.index('/* ===== layout ===== */')];icons=r('icons4.svg')
t=r('app4.tpl.html').replace('/*LOGO*/',r('logo.css')).replace('/*CSS*/',css).replace('/*ICONS*/',icons).replace('/*ABOUT*/',r('about3.html'))
open(os.path.join(A,'index.html'),'w',encoding='utf-8').write(t)
open(os.path.join(A,'tablero.html'),'w',encoding='utf-8').write(r('tablero.tpl.html').replace('/*BASE*/',base).replace('/*ICONS*/',icons))
shutil.copy(os.path.join(D,'app4.js'),os.path.join(A,'app.js'))
print('listo')
