FROM node:18

#dependencias 
RUN apt-get update && apt-get install -y \
    build-essential \
    libvips-dev \
    libcairo2-dev \
    libjpeg-dev \
    libpango1.0-dev \
    libgif-dev \
    librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json ./

# Instalando TODAS las dependencias
RUN npm install

COPY . .

EXPOSE 3000

#CMD ["node", "wait-for-postgres.js"]
CMD ["npm", "run","dev"]