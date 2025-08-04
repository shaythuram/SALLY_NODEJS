#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Setting up Sales Coaching API...\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (!fs.existsSync(envPath)) {
  console.log('📝 Creating .env file from template...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created successfully!');
    console.log('⚠️  Please edit .env file and add your OpenAI API key');
  } else {
    console.log('❌ env.example file not found');
    process.exit(1);
  }
} else {
  console.log('✅ .env file already exists');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit', cwd: path.join(__dirname, '..') });
    console.log('✅ Dependencies installed successfully!');
  } catch (error) {
    console.log('❌ Failed to install dependencies:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Dependencies already installed');
}

// Check OpenAI API key
try {
  require('dotenv').config();
  if (!process.env.OPENAI_API_KEY) {
    console.log('\n⚠️  Warning: OPENAI_API_KEY not found in .env file');
    console.log('   Please add your OpenAI API key to the .env file to use the API');
  } else {
    console.log('\n✅ OpenAI API key found in .env file');
  }
} catch (error) {
  console.log('\n⚠️  Could not check OpenAI API key:', error.message);
}

console.log('\n🎉 Setup complete!');
console.log('\nNext steps:');
console.log('1. Edit .env file and add your OpenAI API key');
console.log('2. Run "npm run dev" to start the development server');
console.log('3. Run "npm test" to run tests');
console.log('4. Check http://localhost:3000/health to verify the server is running');
console.log('\n📚 For more information, see README.md'); 