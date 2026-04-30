import ora from 'ora';
import chalk from 'chalk';
import Table from 'cli-table3';
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  listProfiles,
  getProfile,
  searchProfiles,
  createProfile,
  exportProfiles,
} from '../api.js';

// ── Shared table renderer ─────────────────────────────────────────────────────

function renderProfilesTable(profiles) {
  const table = new Table({
    head: ['Name', 'Gender', 'Age', 'Age Group', 'Country', 'ID'].map(h => chalk.cyan(h)),
    wordWrap: true,
  });

  for (const p of profiles) {
    table.push([
      p.name,
      p.gender,
      String(p.age ?? '—'),
      p.age_group ?? '—',
      `${p.country_name ?? '—'} (${p.country_id ?? '—'})`,
      chalk.dim(p.id),
    ]);
  }

  console.log(table.toString());
}

function renderPagination(data) {
  console.log(
    chalk.dim(`\nPage ${data.page} of ${data.total_pages} — ${data.total} total profiles`),
  );
}

// ── profiles list ─────────────────────────────────────────────────────────────

export async function profilesListCommand(opts) {
  const spinner = ora('Fetching profiles...').start();
  try {
    const filters = {
      gender:     opts.gender,
      age_group:  opts.ageGroup,
      country_id: opts.country,
      min_age:    opts.minAge,
      max_age:    opts.maxAge,
      sort_by:    opts.sortBy,
      order:      opts.order,
      page:       opts.page,
      limit:      opts.limit,
    };

    const data = await listProfiles(filters);
    spinner.stop();

    if (!data.data.length) {
      console.log(chalk.yellow('No profiles found.'));
      return;
    }

    renderProfilesTable(data.data);
    renderPagination(data);
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

// ── profiles get <id> ─────────────────────────────────────────────────────────

export async function profilesGetCommand(id) {
  const spinner = ora(`Fetching profile ${id}...`).start();
  try {
    const p = await getProfile(id);
    spinner.stop();

    const table = new Table();
    table.push(
      ['ID',               chalk.dim(p.id)],
      ['Name',             p.name],
      ['Gender',           p.gender],
      ['Gender Prob.',     String(p.gender_probability)],
      ['Age',              String(p.age ?? '—')],
      ['Age Group',        p.age_group ?? '—'],
      ['Country',          `${p.country_name ?? '—'} (${p.country_id ?? '—'})`],
      ['Country Prob.',    String(p.country_probability)],
      ['Created',          new Date(p.created_at).toLocaleString()],
    );
    console.log(table.toString());
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

// ── profiles search <query> ───────────────────────────────────────────────────

export async function profilesSearchCommand(query, opts) {
  const spinner = ora(`Searching for "${query}"...`).start();
  try {
    const data = await searchProfiles(query, { page: opts.page, limit: opts.limit });
    spinner.stop();

    if (data.parsed) {
      console.log(chalk.dim(`Parsed: ${JSON.stringify(data.parsed)}`));
    }

    if (!data.data.length) {
      console.log(chalk.yellow('No profiles matched your search.'));
      return;
    }

    renderProfilesTable(data.data);
    renderPagination(data);
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

// ── profiles create ───────────────────────────────────────────────────────────

export async function profilesCreateCommand(opts) {
  if (!opts.name) {
    console.error(chalk.red('Error: --name is required'));
    process.exit(1);
  }

  const spinner = ora(`Creating profile for "${opts.name}"...`).start();
  try {
    const p = await createProfile(opts.name);
    spinner.succeed(chalk.green(`Profile created: ${chalk.bold(p.name)} (${p.id})`));
    renderProfilesTable([p]);
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

// ── profiles export ───────────────────────────────────────────────────────────

export async function profilesExportCommand(opts) {
  if (opts.format !== 'csv') {
    console.error(chalk.red('Error: only --format csv is supported'));
    process.exit(1);
  }

  const spinner = ora('Exporting profiles...').start();
  try {
    const filters = {
      gender:     opts.gender,
      country_id: opts.country,
    };

    const { filename, csvText } = await exportProfiles(filters);
    const outputPath = resolve(process.cwd(), filename);
    await writeFile(outputPath, csvText, 'utf8');
    spinner.succeed(chalk.green(`Exported to ${chalk.bold(outputPath)}`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
