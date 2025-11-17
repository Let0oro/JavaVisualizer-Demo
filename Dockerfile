FROM oven/bun:1.1

WORKDIR /app
COPY . .

# Instala dependencias especificadas en package.json
RUN bun install

# (Opcional) Si tienes un build de frontend, descomenta esta línea:
# RUN bun run build

EXPOSE 3000

# Arranca tu servidor Bun
CMD ["bun", "run", "src/index.ts"]
