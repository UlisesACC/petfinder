Para compilar el proyecto requiere de docker y en terminal de la raiz del proyecto ponerle 
```bash
docker-compose up --build
```

Para agregar el css nota modificar la ruta segun el archivo y agregar los input.css
input.css:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```
(Para desarrolladores) i gnerar el css
terminal:
```bash
npm install tailwindcss @tailwindcss/cli
```
terminal:
```bash
npx tailwindcss -i ./src/inicio/input.css -o ./src/inicio/output.css --minify
npx tailwindcss -i ./src/login/input.css -o ./src/login/output.css --minify
npx tailwindcss -i ./src/alta_perro/input.css -o ./src/alta_perro/output.css --minify
npx tailwindcss -i ./src/albergue/input.css -o ./src/albergue/output.css --minify
npx tailwindcss -i ./src/perdido/input.css -o ./src/perdido/output.css --minify
```