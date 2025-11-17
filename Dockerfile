FROM oven/bun:1.1 as build
WORKDIR /app
COPY . .
RUN bun install --frozen-lockfile
# build frontend si procede: (opcional)
# RUN bun run build
EXPOSE 3000
CMD ["bun", "run", "src/index.ts"]
