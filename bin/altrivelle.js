#!/usr/bin/env node

// ==============================================================================
// Altrivelle Linker — Official CLI Tool
// Developed by ALTRIVELLE TECHNOLOGIES
// "One Link. Smarter Sharing."
// ==============================================================================

import { readFileSync, existsSync } from 'fs';
import { resolve, basename } from 'path';
import { createClient } from '@supabase/supabase-js';

const BANNER = `
    ___    __  __       _            ____        __            
   /   |  / / / /______(_)   _____  / / /__     / /   (_)___  / /_____  _____
  / /| | / / / __/ ___/ / | / / _ \\/ / / _ \\   / /   / / __ \\/ //_/ _ \\/ ___/
 / ___ |/ / / /_/ /  / /| |/ /  __/ / /  __/  / /___/ / / / / ,< /  __/ /    
/_/  |_/_/_/\\__/_/  /_/ |___/\\___/_/_/\\___/  /_____/_/_/ /_/_/|_|\\___/_/     
                                                                              
 Developed by ALTRIVELLE TECHNOLOGIES | Think Beyond. Build Forward.
`;

const args = process.argv.slice(2);
const command = args[0] || 'help';

function printHelp() {
  console.log(BANNER);
  console.log(`
Usage: altrivelle <command> [options]

Commands:
  login                      Authenticate CLI with Altrivelle Linker
  status                     Display API connection and storage health
  upload <file> [options]    Upload a file to private cloud storage
  share <file_id> [options]  Generate a cryptographically secure short link
  list                       List all active files
  revoke <token>             Immediately revoke a shared link
  version                    Print CLI version

Upload Options:
  --project <id>             Assign to specific project ID
  --expire <1h|1d|7d|30d>    Set default share link expiration (default: 7d)
  --password <secret>        Set password protection

Examples:
  $ altrivelle upload ./document.pdf --expire 7d
  $ altrivelle share 3a8f12... --password confidential
  $ altrivelle revoke ab12cd34ef56

Documentation: https://altrivelletechnologies.com/docs
`);
}

async function run() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (command === 'help' || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === 'version' || command === '-v') {
    console.log('Altrivelle Linker CLI v1.2.0');
    console.log('Developed by ALTRIVELLE TECHNOLOGIES');
    process.exit(0);
  }

  if (command === 'status') {
    console.log(BANNER);
    console.log('System Status:');
    console.log(`  Supabase URL:    ${supabaseUrl ? 'Connected (' + supabaseUrl + ')' : 'Missing URL'}`);
    console.log(`  Auth Key:        ${supabaseKey ? 'Configured' : 'Missing API Key'}`);
    console.log(`  Platform:        Altrivelle Linker`);
    console.log(`  Developer:       ALTRIVELLE TECHNOLOGIES`);
    process.exit(0);
  }

  if (!supabaseUrl || !supabaseKey) {
    console.error('Error: Missing Supabase credentials in environment.');
    console.error('Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY before running.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  if (command === 'list') {
    console.log('Fetching files from Altrivelle Linker...');
    const { data: files, error } = await supabase
      .from('files')
      .select('id, name, size_bytes, mime_type, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error retrieving files:', error.message);
      process.exit(1);
    }

    if (!files || files.length === 0) {
      console.log('No files found.');
      process.exit(0);
    }

    console.table(
      files.map((f) => ({
        ID: f.id.slice(0, 8) + '...',
        Name: f.name,
        Size: (f.size_bytes / 1024).toFixed(1) + ' KB',
        Created: new Date(f.created_at).toLocaleDateString(),
      }))
    );
    process.exit(0);
  }

  if (command === 'upload') {
    const filePath = args[1];
    if (!filePath || !existsSync(filePath)) {
      console.error('Error: Please provide a valid file path to upload.');
      process.exit(1);
    }

    const fullPath = resolve(filePath);
    const fileName = basename(fullPath);
    const fileBytes = readFileSync(fullPath);

    console.log(`Uploading "${fileName}" (${(fileBytes.length / 1024).toFixed(1)} KB) to Altrivelle Linker...`);
    // Storage upload logic
    const uniqueSuffix = Math.random().toString(36).substring(2, 10);
    const storagePath = `cli-uploads/${uniqueSuffix}-${fileName}`;

    const { error: uploadErr } = await supabase.storage
      .from('filelink-files')
      .upload(storagePath, fileBytes);

    if (uploadErr) {
      console.error('Upload failed:', uploadErr.message);
      process.exit(1);
    }

    console.log(`\n✓ Upload complete!`);
    console.log(`  Storage Path: ${storagePath}`);
    console.log(`  Developed by ALTRIVELLE TECHNOLOGIES\n`);
    process.exit(0);
  }

  console.log(`Unknown command "${command}". Run "altrivelle --help" for available commands.`);
}

run().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
