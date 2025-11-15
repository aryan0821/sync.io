#!/bin/bash

echo "🚀 sync.io Setup Script"
echo "======================="
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if command -v node &> /dev/null; then
    echo "  ✅ Node.js $(node --version) is installed"
else
    echo "  ❌ Node.js is not installed"
    echo "  👉 Install with: sudo apt install nodejs"
    exit 1
fi

# Check npm
echo ""
echo "✓ Checking npm..."
if command -v npm &> /dev/null; then
    echo "  ✅ npm $(npm --version) is installed"
else
    echo "  ❌ npm is not installed"
    echo "  👉 Install with: sudo apt install npm"
    echo ""
    echo "Running installation command..."
    sudo apt install npm
    if [ $? -ne 0 ]; then
        echo "  ❌ Failed to install npm"
        exit 1
    fi
fi

# Install dependencies
echo ""
echo "✓ Installing project dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "  ❌ Failed to install dependencies"
    exit 1
fi
echo "  ✅ Dependencies installed"

# Check .env file
echo ""
echo "✓ Checking .env file..."
if [ -f ".env" ]; then
    echo "  ✅ .env file exists"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env file with your credentials:"
    echo "  - SLACK_BOT_TOKEN"
    echo "  - SLACK_SIGNING_SECRET"
    echo "  - SLACK_APP_TOKEN"
    echo "  - GITHUB_TOKEN"
    echo "  - GITHUB_OWNER"
    echo "  - GITHUB_REPO"
    echo ""
    echo "📝 Edit with: nano .env"
else
    echo "  ❌ .env file not found"
    echo "  👉 Copy .env.example to .env and fill in your credentials"
    exit 1
fi

# Build TypeScript
echo ""
echo "✓ Building TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "  ⚠️  Build failed, but you can still run in dev mode"
else
    echo "  ✅ Build successful"
fi

echo ""
echo "============================================"
echo "✅ Setup Complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "  1. Edit .env with your credentials:"
echo "     nano .env"
echo ""
echo "  2. Run the bot:"
echo "     npm run dev    (development mode)"
echo "     npm start      (production mode)"
echo ""
echo "📖 For detailed setup instructions:"
echo "  - Basic setup: README.md"
echo "  - Email setup: EMAIL_SETUP.md"
echo ""

