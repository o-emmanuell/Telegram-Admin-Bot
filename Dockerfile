FROM node:22-slim

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy lockfile and workspace configurations first
COPY pnpm-lock.yaml package.json pnpm-workspace.yaml* ./

# Copy all project files
COPY . .

# Install all workspace dependencies
RUN pnpm install --frozen-lockfile

# Build the specific api-server package
RUN pnpm --filter @workspace/api-server build

# Set the start command
CMD ["pnpm", "--filter", "@workspace/api-server", "start"]
