#!/bin/bash
# Local CI check script - Run this before pushing to GitHub
# This mimics what GitHub Actions does

set -e  # Exit on any error

echo "🔍 Running local CI checks..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm is not installed${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
pnpm install --frozen-lockfile

echo ""
echo -e "${YELLOW}🔍 Running linter...${NC}"
if pnpm lint; then
    echo -e "${GREEN}✅ Linter passed${NC}"
else
    echo -e "${RED}❌ Linter failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Running type check...${NC}"
if pnpm type-check; then
    echo -e "${GREEN}✅ Type check passed${NC}"
else
    echo -e "${RED}❌ Type check failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Building backend...${NC}"
if pnpm build; then
    echo -e "${GREEN}✅ Backend build passed${NC}"
else
    echo -e "${RED}❌ Backend build failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"
cd web
pnpm install --frozen-lockfile

echo ""
echo -e "${YELLOW}🔍 Running frontend type check...${NC}"
if pnpm type-check; then
    echo -e "${GREEN}✅ Frontend type check passed${NC}"
else
    echo -e "${RED}❌ Frontend type check failed${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}🔍 Building frontend...${NC}"
if pnpm build; then
    echo -e "${GREEN}✅ Frontend build passed${NC}"
else
    echo -e "${RED}❌ Frontend build failed${NC}"
    exit 1
fi

cd ..

echo ""
echo -e "${GREEN}✅ All CI checks passed! Safe to push to GitHub.${NC}"
