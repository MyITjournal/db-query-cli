#!/usr/bin/env node
import { Command } from 'commander';
import { loginCommand }           from '../src/commands/login.js';
import { logoutCommand }          from '../src/commands/logout.js';
import { whoamiCommand }          from '../src/commands/whoami.js';
import {
  profilesListCommand,
  profilesGetCommand,
  profilesSearchCommand,
  profilesCreateCommand,
  profilesExportCommand,
} from '../src/commands/profiles.js';

const program = new Command();

program
  .name('insighta')
  .description('CLI tool for the Insighta profiles API')
  .version('1.0.0');

// ── Auth ──────────────────────────────────────────────────────────────────────

program
  .command('login')
  .description('Log in via GitHub OAuth')
  .action(loginCommand);

program
  .command('logout')
  .description('Log out and clear saved credentials')
  .action(logoutCommand);

program
  .command('whoami')
  .description('Show the currently logged-in user')
  .action(whoamiCommand);

// ── Profiles ──────────────────────────────────────────────────────────────────

const profiles = program.command('profiles').description('Manage profiles');

profiles
  .command('list')
  .description('List profiles with optional filters')
  .option('--gender <gender>',       'Filter by gender (male|female)')
  .option('--age-group <group>',     'Filter by age group (child|teenager|adult|senior)')
  .option('--country <code>',        'Filter by ISO country code (e.g. NG)')
  .option('--min-age <n>',           'Minimum age', Number)
  .option('--max-age <n>',           'Maximum age', Number)
  .option('--sort-by <field>',       'Sort field (age|created_at|gender_probability)')
  .option('--order <dir>',           'Sort direction (asc|desc)', 'desc')
  .option('--page <n>',              'Page number', Number, 1)
  .option('--limit <n>',             'Results per page (1-50)', Number, 10)
  .action(profilesListCommand);

profiles
  .command('get <id>')
  .description('Get a profile by ID')
  .action(profilesGetCommand);

profiles
  .command('search <query>')
  .description('Natural language profile search')
  .option('--page <n>',  'Page number', Number, 1)
  .option('--limit <n>', 'Results per page', Number, 10)
  .action(profilesSearchCommand);

profiles
  .command('create')
  .description('Create a new profile (admin only)')
  .requiredOption('--name <name>', 'Profile name')
  .action(profilesCreateCommand);

profiles
  .command('export')
  .description('Export profiles as CSV to current directory')
  .requiredOption('--format <fmt>', 'Export format (csv)')
  .option('--gender <gender>',  'Filter by gender')
  .option('--country <code>',   'Filter by country code')
  .action(profilesExportCommand);

program.parse();
